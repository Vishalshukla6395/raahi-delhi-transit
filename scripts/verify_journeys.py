"""Exercise real GTFS and modeled ticket demand through the running HTTP API."""

import json
import time
from pathlib import Path
import httpx

root = Path(__file__).resolve().parents[1]
with httpx.Client(base_url="http://127.0.0.1:8000", timeout=180) as client:
    demo = client.get("/api/v1/demo").raise_for_status().json()
    assert demo["available"], demo
    for stop in (demo["origin"], demo["destination"]):
        found = (
            client.get("/api/v1/stops", params={"q": stop["name"], "limit": 50})
            .raise_for_status()
            .json()
        )
        assert any(s["id"] == stop["id"] for s in found["items"]), found
    cases = []
    for hour, mode in [(8, "fastest"), (18, "balanced"), (18, "less_crowded")]:
        body = dict(
            origin=demo["origin"]["id"],
            destination=demo["destination"]["id"],
            departure=f"2026-11-24T{hour:02}:00:00+05:30",
            mode=mode,
            transfers=True,
        )
        start = time.perf_counter()
        response = client.post("/api/v1/journeys/search", json=body)
        response.raise_for_status()
        data = response.json()
        elapsed = time.perf_counter() - start
        assert data["journeys"], data
        assert len(data["departure_comparison"]) == 4
        for journey in data["journeys"]:
            for leg in journey["legs"]:
                assert leg["segments"]
                for segment in leg["segments"]:
                    assert segment["minutes"] >= 0
                    prediction = segment["prediction"]
                    assert (
                        prediction["index"] is None or 0 <= prediction["index"] <= 100
                    )
        known = [
            s
            for j in data["journeys"]
            for l in j["legs"]
            for s in l["segments"]
            if s["prediction"]["index"] is not None
        ]
        assert known, "No supported segment predictions"
        segment = known[0]
        exact = client.get(
            "/api/v1/crowding/segment",
            params={
                "key": segment["id"],
                "departure": data["journeys"][0]["legs"][0]["departure"],
            },
        )
        exact.raise_for_status()
        case = dict(
            request=body,
            elapsed_seconds=round(elapsed, 3),
            alternatives=len(data["journeys"]),
            journeys=[
                dict(
                    routes=[l["route"] for l in j["legs"]],
                    duration=j["duration_minutes"],
                    demand_index=j["demand_index"],
                    coverage=j["prediction_coverage"],
                    transfers=j["transfers"],
                )
                for j in data["journeys"]
            ],
            departure_options=[
                dict(offset=c["offset_minutes"], available=c["journey"] is not None)
                for c in data["departure_comparison"]
            ],
        )
        cases.append(case)
        print(json.dumps(case), flush=True)
    result = dict(
        status="PASS",
        data="Official full GTFS and actual October e-ticket records",
        demo=demo,
        cases=cases,
        browser_verified=False,
        scope="Real localhost HTTP integration; not browser or field verification",
    )
    (root / "data/reports/journey-verification.json").write_text(
        json.dumps(result, indent=2), encoding="utf-8"
    )
