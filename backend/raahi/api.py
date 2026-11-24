"""Versioned read-only API. Missing data never becomes a synthetic success response."""

import json
import gzip
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from functools import lru_cache
from pathlib import Path
from typing import Literal
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, field_validator
from .config import PROCESSED, REPORTS, ROOT
from .domain import IST, normalize
from .network import Network
from .model import DemandModel
from .planner import Planner, WEIGHTS, compare_journeys
from .schemas import JourneyResponse


def read_json(path, default=None):
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    compressed = path.with_suffix(path.suffix + ".gz")
    if compressed.exists():
        with gzip.open(compressed, "rt", encoding="utf-8") as stream:
            return json.load(stream)
    return default


class SearchRequest(BaseModel):
    origin: str
    destination: str
    departure: datetime
    mode: Literal["fastest", "balanced", "less_crowded"] = "balanced"
    transfers: bool = True

    @field_validator("departure")
    @classmethod
    def timezone_required(cls, v):
        if v.tzinfo is None:
            raise ValueError("An explicit timezone offset is required")
        return v.astimezone(IST)


def create_app():
    @asynccontextmanager
    async def lifespan(app):
        app.state.quality = read_json(REPORTS / "data-quality.json", {})
        app.state.validation = read_json(REPORTS / "validation.json", {})
        app.state.network_quality = read_json(
            REPORTS / "network-quality.json",
            {"status": "blocked", "reason": "Run data pipeline"},
        )
        network_data = read_json(PROCESSED / "network.json")
        app.state.network = Network.from_dict(network_data) if network_data else None
        route_data = read_json(PROCESSED / "route-model.json")
        app.state.route_model = DemandModel(route_data) if route_data else None
        segment_data = read_json(PROCESSED / "segment-model.json")
        app.state.segment_model = DemandModel(segment_data) if segment_data else None
        app.state.planner = (
            Planner(app.state.network, app.state.segment_model)
            if app.state.network
            else None
        )
        yield

    app = FastAPI(
        title="RAAHI demand and journey API", version="1.0.0", lifespan=lifespan
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )

    @app.get("/health")
    def health():
        return dict(
            status="ok",
            data_ready=bool(app.state.quality),
            routing_ready=app.state.planner is not None,
        )

    @app.get("/api/v1/analytics/overview")
    def overview():
        q = app.state.quality
        return dict(
            schema_version="1.0",
            quality={k: v for k, v in q.items() if k not in ("route_names",)},
            network=app.state.network_quality,
            validation=app.state.validation,
            segment_validation=read_json(REPORTS / "segment-validation.json"),
            model_audit=read_json(REPORTS / "model-audit.json"),
            historical_only=True,
            weights=WEIGHTS,
            limitations=[
                "Partial e-ticket sample, not passenger occupancy.",
                "Transaction times proxy the travel period.",
                "Cross-route sampling rates may differ.",
                "Timetable times are unverified estimates.",
            ],
        )

    @app.get("/api/v1/stops")
    def stops(q: str = Query("", max_length=100), limit: int = Query(12, ge=1, le=50)):
        if not app.state.network:
            return dict(
                items=[],
                available=False,
                reason=app.state.network_quality.get("reason", "GTFS unavailable"),
            )
        matches = [
            s
            for s in app.state.network.stops.values()
            if s["id"] in app.state.network.stop_patterns
            and normalize(q) in normalize(s["name"])
        ]
        matches.sort(
            key=lambda s: (
                not normalize(s["name"]).startswith(normalize(q)),
                s["name"],
                s["id"],
            )
        )
        return dict(items=matches[:limit], available=True)

    @app.get("/api/v1/routes")
    def routes(q: str = Query("", max_length=100)):
        return dict(
            items=[
                r
                for r in app.state.quality.get("route_names", [])
                if normalize(q) in normalize(r["name"])
            ][:300],
            source="October ticket labels; not all routes have a matched GTFS pattern",
        )

    @lru_cache(maxsize=128)
    def cached_search(origin, destination, departure, mode, transfers):
        return app.state.planner.search(
            origin, destination, datetime.fromisoformat(departure), mode, transfers
        )

    @app.post("/api/v1/journeys/search", response_model=JourneyResponse)
    def search(body: SearchRequest):
        if not app.state.planner:
            raise HTTPException(
                503,
                detail={
                    "code": "GTFS_REQUIRED",
                    "message": "Journey planning needs the authorised complete Delhi bus GTFS feed. Historical ticket insights remain available.",
                },
            )
        try:
            journeys = cached_search(
                body.origin,
                body.destination,
                body.departure.isoformat(),
                body.mode,
                body.transfers,
            )
            fastest = cached_search(body.origin, body.destination, body.departure.isoformat(), 'fastest', body.transfers)
            reference = fastest[0] if fastest else None
            # Copy cached objects: comparisons belong to this request, not the cache.
            journeys = [dict(j, comparison=compare_journeys(reference,j) if reference else None) for j in journeys]
            comparisons = []
            for minutes in (0, 15, 30, 60):
                when = body.departure + timedelta(minutes=minutes)
                items = (
                    journeys
                    if minutes == 0
                    else cached_search(
                        body.origin,
                        body.destination,
                        when.isoformat(),
                        body.mode,
                        body.transfers,
                    )
                )
                best = dict(items[0]) if items else None
                if best and reference:
                    best['comparison'] = compare_journeys(reference,best,minutes)
                comparisons.append(
                    dict(
                        offset_minutes=minutes, departure=when.isoformat(), journey=best
                    )
                )
            return dict(
                schema_version="1.0",
                journeys=journeys,
                departure_comparison=comparisons,
                weights=WEIGHTS[body.mode],
                message=None
                if journeys
                else "No scheduled journey found within two hours, allowing at most one transfer.",
            )
        except ValueError as e:
            raise HTTPException(422, detail=str(e))

    @app.get("/api/v1/crowding/route-profile")
    def route_profile(
        route: str = Query(min_length=1, max_length=100), date: str = "2026-11-23"
    ):
        try:
            day = datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=IST)
        except ValueError:
            raise HTTPException(422, detail="Use a valid YYYY-MM-DD date")
        model = app.state.route_model
        key = normalize(route)
        if model is None:
            raise HTTPException(503, detail="Run model pipeline first")
        if key not in model.data["models"]:
            raise HTTPException(404, detail="No historical observations for this route")
        return dict(
            route=key,
            date=date,
            scope="Route-wide sampled boarding demand; not onboard segment load",
            bin_minutes=model.data["minutes"],
            historical_through=model.data["last_date"],
            points=[
                dict(
                    time=f"{m // 60:02}:{m % 60:02}",
                    **model.predict(key, day + timedelta(minutes=m)),
                )
                for m in range(0, 1440, model.data["minutes"])
            ],
        )

    @app.get("/api/v1/crowding/segment")
    def segment(key: str, departure: datetime):
        if departure.tzinfo is None:
            raise HTTPException(422, detail="Timezone required")
        if not app.state.segment_model:
            raise HTTPException(503, detail="Matched segment model unavailable")
        return app.state.segment_model.predict(key, departure.astimezone(IST))

    @app.get("/api/v1/demo")
    def demo():
        n = app.state.network
        model = app.state.segment_model
        if not n or not model:
            return dict(
                available=False,
                reason="A validated full-feed journey is not available yet.",
            )
        # A discovered example is only a query preset; recommendations are always
        # recomputed by the same planner. Fall back if its stops are absent.
        examples = read_json(REPORTS / 'tradeoff-examples.json', {}).get('cases', [])
        for c in examples:
            if (c['fastest']['evidence'] == c['comfort']['evidence'] == 'moderate'
                and c['origin']['id'] in n.stops and c['destination']['id'] in n.stops):
                return dict(available=True,origin=n.stops[c['origin']['id']],destination=n.stops[c['destination']['id']],
                            departure=c['departure'],mode='less_crowded',transfers=False,
                            reason='Illustrative trade-off discovered in real data; not a representative impact measurement.')
        for key, m in sorted(
            model.data["models"].items(), key=lambda kv: kv[1]["tickets"], reverse=True
        ):
            pid, idx = key.split(":")
            p = n.patterns[pid]
            i = int(idx)
            return dict(
                available=True,
                origin=n.stops[p["stops"][i]],
                destination=n.stops[p["stops"][min(i + 5, len(p["stops"]) - 1)]],
                route=p["name"],
                reason="Selected by matched historical ticket evidence; schedules still depend on date.",
            )
        return dict(available=False)

    dist = ROOT / "frontend/dist"
    if dist.exists():
        app.mount("/", StaticFiles(directory=dist, html=True), name="web")
    return app


app = create_app()
