"""Strict GTFS network loading, service calendars, and unambiguous ticket matching."""

import csv
import hashlib
import io
import json
import zipfile
from collections import defaultdict
from datetime import date
from functools import lru_cache
from pathlib import Path
from .domain import normalize, gtfs_seconds


class Network:
    def __init__(self, source: Path):
        self.source = source
        self.errors = []

        def read(name, required=True):
            if source.is_dir():
                paths = list(source.rglob(name))
                text = (
                    paths[0].read_text(encoding="utf-8-sig")
                    if len(paths) == 1
                    else None
                )
            else:
                with zipfile.ZipFile(source) as z:
                    paths = [
                        p
                        for p in z.namelist()
                        if Path(p).name == name and not p.startswith("__MACOSX")
                    ]
                    text = (
                        z.read(paths[0]).decode("utf-8-sig")
                        if len(paths) == 1
                        else None
                    )
            if text is None:
                if required:
                    raise ValueError(f"Missing or ambiguous {name}")
                return []
            return list(csv.DictReader(io.StringIO(text)))

        self.stops = {
            s["stop_id"]: dict(
                id=s["stop_id"],
                name=s["stop_name"],
                lat=float(s["stop_lat"]),
                lon=float(s["stop_lon"]),
            )
            for s in read("stops.txt")
        }
        if any(
            not (-90 <= s["lat"] <= 90 and -180 <= s["lon"] <= 180)
            for s in self.stops.values()
        ):
            raise ValueError("Invalid stop coordinates")
        self.routes = {
            r["route_id"]: r for r in read("routes.txt") if r["route_type"] == "3"
        }
        self.trips = {
            t["trip_id"]: t for t in read("trips.txt") if t["route_id"] in self.routes
        }
        self.calendar = {c["service_id"]: c for c in read("calendar.txt", False)}
        self.exceptions = {
            (c["service_id"], c["date"]): c["exception_type"]
            for c in read("calendar_dates.txt", False)
        }
        if not self.calendar and not self.exceptions:
            raise ValueError("No service calendar; cannot infer operating days")
        if read("frequencies.txt", False):
            raise ValueError(
                "Frequency-based feeds are not supported in this Phase 1 importer"
            )
        self.feed_info = read("feed_info.txt", False)
        times = defaultdict(list)
        all_times = read("stop_times.txt")
        dangling = sum(t["trip_id"] not in self.trips for t in all_times)
        missing_stops = sum(t["stop_id"] not in self.stops for t in all_times)
        self.quality = dict(
            stops=len(self.stops),
            routes=len(self.routes),
            trips=len(self.trips),
            stop_times=len(all_times),
            dangling_stop_times=dangling,
            missing_stops=missing_stops,
        )
        if dangling or missing_stops:
            raise ValueError(
                f"Disconnected GTFS: {dangling}/{len(all_times)} stop-time rows lack valid bus trips; {missing_stops} lack stops"
            )
        for t in all_times:
            times[t["trip_id"]].append(t)
        self.patterns = {}
        self.trip_pattern = {}
        for tid, rows in times.items():
            rows.sort(key=lambda r: int(r["stop_sequence"]))
            trip = self.trips[tid]
            ids = [r["stop_id"] for r in rows]
            try:
                arrivals = [gtfs_seconds(r["arrival_time"]) for r in rows]
                departures = [gtfs_seconds(r["departure_time"]) for r in rows]
                if len(set(r["stop_sequence"] for r in rows)) != len(rows):
                    raise ValueError("duplicate sequence")
                if (
                    len(rows) < 2
                    or any(a > d for a, d in zip(arrivals, departures))
                    or any(a < d for a, d in zip(arrivals[1:], departures[:-1]))
                ):
                    raise ValueError("non-monotonic times")
            except (ValueError, KeyError) as e:
                self.errors.append({"trip_id": tid, "reason": str(e)})
                continue
            key = (
                trip["route_id"]
                + "|"
                + trip.get("direction_id", "")
                + "|"
                + "|".join(ids)
            )
            pid = hashlib.sha256(key.encode()).hexdigest()[:16]
            route = self.routes[trip["route_id"]]
            pattern = self.patterns.setdefault(
                pid,
                dict(
                    id=pid,
                    route_id=trip["route_id"],
                    name=route.get("route_short_name") or route["route_long_name"],
                    direction=trip.get("direction_id", ""),
                    stops=ids,
                    trips=[],
                ),
            )
            pattern["trips"].append(
                dict(
                    id=tid,
                    service_id=trip["service_id"],
                    arrivals=arrivals,
                    departures=departures,
                    pickup=[r.get("pickup_type", "0") or "0" for r in rows],
                    dropoff=[r.get("drop_off_type", "0") or "0" for r in rows],
                )
            )
            self.trip_pattern[tid] = pid
        if not self.patterns:
            raise ValueError("No valid scheduled route patterns")
        self.aliases = defaultdict(set)
        self.stop_patterns = defaultdict(set)
        for pid, p in self.patterns.items():
            r = self.routes[p["route_id"]]
            for name in (r.get("route_short_name", ""), r.get("route_long_name", "")):
                if name:
                    self.aliases[normalize(name)].add(pid)
            for sid in p["stops"]:
                self.stop_patterns[sid].add(pid)
        self.quality.update(
            patterns=len(self.patterns),
            rejected_trips=len(self.errors),
            unused_trips=len(self.trips) - len(times),
        )

    @lru_cache(maxsize=512)
    def active(self, service_id: str, day: date) -> bool:
        stamp = day.strftime("%Y%m%d")
        exception = self.exceptions.get((service_id, stamp))
        if exception is not None:
            return exception == "1"
        c = self.calendar.get(service_id)
        return bool(
            c
            and c["start_date"] <= stamp <= c["end_date"]
            and c[
                (
                    "monday",
                    "tuesday",
                    "wednesday",
                    "thursday",
                    "friday",
                    "saturday",
                    "sunday",
                )[day.weekday()]
            ]
            == "1"
        )

    def match(self, route, board, alight):
        patterns = self.aliases.get(normalize(route), set())
        if not patterns:
            return None, "unknown_route"
        matches = []
        for pid in patterns:
            p = self.patterns[pid]
            a = [
                i
                for i, s in enumerate(p["stops"])
                if normalize(self.stops[s]["name"]) == normalize(board)
            ]
            b = [
                i
                for i, s in enumerate(p["stops"])
                if normalize(self.stops[s]["name"]) == normalize(alight)
            ]
            for i in a:
                for j in b:
                    if i < j:
                        matches.append((pid, i, j))
        if len(matches) == 1:
            return matches[0], "matched"
        return None, "ambiguous_path" if matches else "unmatched_stops_or_direction"

    def scheduled_services(self, pid, index, day, bucket, minutes):
        return sum(
            self.active(t["service_id"], day)
            and bucket * minutes * 60
            <= t["departures"][index]
            < (bucket + 1) * minutes * 60
            for t in self.patterns[pid]["trips"]
        )

    def to_dict(self):
        return dict(
            stops=self.stops,
            patterns=self.patterns,
            calendar=self.calendar,
            exceptions=[[*k, v] for k, v in self.exceptions.items()],
            quality=self.quality,
            feed_info=self.feed_info,
        )

    @classmethod
    def from_dict(cls, data):
        n = cls.__new__(cls)
        n.stops = data["stops"]
        n.patterns = data["patterns"]
        n.calendar = data["calendar"]
        n.exceptions = {(a, b): v for a, b, v in data["exceptions"]}
        n.quality = data["quality"]
        n.stop_patterns = defaultdict(set)
        for pid, p in n.patterns.items():
            for s in p["stops"]:
                n.stop_patterns[s].add(pid)
        return n
