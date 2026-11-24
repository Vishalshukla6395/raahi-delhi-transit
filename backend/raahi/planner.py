"""Schedule-based direct and single-transfer planning. No guessed frequencies or ETAs."""

from datetime import datetime, timedelta
from .domain import IST

WEIGHTS = {
    "fastest": (1.0, 0.0, 0.0),
    "balanced": (0.65, 0.25, 0.10),
    "less_crowded": (0.25, 0.65, 0.10),
}


def compare_journeys(reference, candidate, offset_minutes=0):
    """Explain differences without treating percentiles as occupancy percentages."""
    complete = all(j.get('prediction_coverage') == 1 and j.get('demand_index') is not None
                   for j in (reference, candidate))
    return dict(
        extra_minutes=candidate['duration_minutes'] + offset_minutes - reference['duration_minutes'],
        index_points_lower=reference['demand_index'] - candidate['demand_index'] if complete else None,
        status=('comparable' if all(j.get('evidence') == 'moderate' for j in (reference,candidate)) else 'limited') if complete else 'unavailable',
        reference_minutes=reference['duration_minutes'],
        reference_index=reference.get('demand_index'),
        caveat='Sampled demand index points, not percent fewer passengers. Different sampling rates and service supply can change the comparison.',
    )


def rank_journeys(journeys, mode):
    if not journeys:
        return []
    fastest = min(j["duration_minutes"] for j in journeys)
    # Bounded detour for comfort modes; unavailable demand is never rewarded.
    eligible = [
        j
        for j in journeys
        if mode == "fastest"
        or j["duration_minutes"] <= min(fastest + 30, fastest * 1.5)
    ]
    wt, wc, wx = WEIGHTS[mode]
    for j in eligible:
        crowd = (
            j["demand_index"] / 100
            if j["demand_index"] is not None and j["prediction_coverage"] == 1
            else 1.25
        )
        j["score"] = round(
            wt * j["duration_minutes"] / max(fastest, 1)
            + wc * crowd
            + wx * j["transfers"],
            4,
        )
        j["explanation"] = (
            f"{j['duration_minutes']} min from requested departure, {j['transfers']} transfer(s). "
        )
        j["explanation"] += (
            "Crowd comparison unavailable on part of this journey."
            if j["prediction_coverage"] < 1
            else "Lower relative sampled demand contributes to comfort ranking; occupancy is unverified."
        )
    return sorted(eligible, key=lambda j: (j["score"], j["duration_minutes"]))


class Planner:
    def __init__(self, network, model=None):
        self.network = network
        self.model = model

    def departures(self, pid, index, earliest, horizon_minutes=120):
        p = self.network.patterns[pid]
        found = []
        for offset in (-1, 0, 1):
            day = earliest.date() + timedelta(days=offset)
            midnight = datetime.combine(day, datetime.min.time(), IST)
            for t in p["trips"]:
                if (
                    not self.network.active(t["service_id"], day)
                    or t["pickup"][index] != "0"
                ):
                    continue
                depart = midnight + timedelta(seconds=t["departures"][index])
                if earliest <= depart <= earliest + timedelta(minutes=horizon_minutes):
                    found.append((depart, t, midnight))
        return sorted(found, key=lambda x: x[0])

    def leg(self, pid, i, j, departure):
        depart, trip, midnight = departure
        p = self.network.patterns[pid]
        segments = []
        # All segments use boarding transaction-time proxy. No unsupported downstream time propagation.
        for k in range(i, j):
            pred = (
                self.model.predict(f"{pid}:{k}", depart)
                if self.model
                else dict(
                    index=None,
                    category="Unavailable",
                    evidence="unavailable",
                    observed_days=0,
                    tickets=0,
                )
            )
            seconds = trip["arrivals"][k + 1] - trip["departures"][k]
            segments.append(
                dict(
                    id=f"{pid}:{k}",
                    start=self.network.stops[p["stops"][k]],
                    end=self.network.stops[p["stops"][k + 1]],
                    minutes=round(seconds / 60, 2),
                    prediction=pred,
                )
            )
        arrive = midnight + timedelta(seconds=trip["arrivals"][j])
        return dict(
            pattern_id=pid,
            route=p["name"],
            trip_id=trip["id"],
            origin=self.network.stops[p["stops"][i]],
            destination=self.network.stops[p["stops"][j]],
            departure=depart.isoformat(),
            arrival=arrive.isoformat(),
            segments=segments,
        )

    def search(self, origin, destination, when, mode="balanced", transfers=True):
        n = self.network
        if origin not in n.stops or destination not in n.stops:
            raise ValueError("Choose valid GTFS stop IDs")
        if origin == destination:
            raise ValueError("Origin and destination must differ")
        if when.tzinfo is None:
            raise ValueError("Departure time must include a timezone")
        when = when.astimezone(IST)
        candidates = []
        starts = n.stop_patterns.get(origin, set())
        ends = n.stop_patterns.get(destination, set())
        for pid in sorted(starts & ends):
            p = n.patterns[pid]
            for i, s in enumerate(p["stops"]):
                if s != origin:
                    continue
                for j in range(i + 1, len(p["stops"])):
                    if p["stops"][j] != destination:
                        continue
                    for dep in self.departures(pid, i, when)[:6]:
                        if dep[1]["dropoff"][j] == "0":
                            candidates.append([self.leg(pid, i, j, dep)])
        if transfers:
            for p1 in sorted(starts):
                a = n.patterns[p1]
                for i, s in enumerate(a["stops"]):
                    if s != origin:
                        continue
                    for dep1 in self.departures(p1, i, when)[:2]:
                        for x in range(i + 1, len(a["stops"])):
                            sid = a["stops"][x]
                            if (
                                sid in (origin, destination)
                                or dep1[1]["dropoff"][x] != "0"
                            ):
                                continue
                            onward = n.stop_patterns[sid] & ends - {p1}
                            if not onward:
                                continue
                            # Only materialise segment predictions after a feasible connection exists.
                            earliest = dep1[2] + timedelta(
                                seconds=dep1[1]["arrivals"][x], minutes=5
                            )
                            first = None
                            for p2 in sorted(onward):
                                if p1 == p2:
                                    continue
                                b = n.patterns[p2]
                                for y, s2 in enumerate(b["stops"]):
                                    if s2 != sid:
                                        continue
                                    for z in range(y + 1, len(b["stops"])):
                                        if b["stops"][z] != destination:
                                            continue
                                        for dep2 in self.departures(
                                            p2, y, earliest, 45
                                        )[:1]:
                                            if dep2[1]["dropoff"][z] == "0":
                                                if first is None:
                                                    first = self.leg(p1, i, x, dep1)
                                                candidates.append(
                                                    [first, self.leg(p2, y, z, dep2)]
                                                )
        results = []
        seen = set()
        for legs in candidates:
            signature = tuple(
                (
                    l["trip_id"],
                    l["origin"]["id"],
                    l["destination"]["id"],
                    l["departure"],
                )
                for l in legs
            )
            if signature in seen:
                continue
            seen.add(signature)
            duration = (
                datetime.fromisoformat(legs[-1]["arrival"]) - when
            ).total_seconds() / 60
            if duration <= 0 or duration > 240:
                continue
            segments = [s for l in legs for s in l["segments"]]
            known = [s for s in segments if s["prediction"]["index"] is not None]
            denominator = sum(max(s["minutes"], 0.1) for s in known)
            index = (
                round(
                    sum(
                        s["prediction"]["index"] * max(s["minutes"], 0.1) for s in known
                    )
                    / denominator
                )
                if known
                else None
            )
            results.append(
                dict(
                    id=str(len(results)),
                    legs=legs,
                    duration_minutes=round(duration),
                    ride_minutes=round(sum(s["minutes"] for s in segments)),
                    transfers=len(legs) - 1,
                    demand_index=index,
                    prediction_coverage=len(known) / len(segments),
                    evidence="limited"
                    if any(s["prediction"]["evidence"] != "moderate" for s in segments)
                    else "moderate",
                    timing_basis="GTFS schedule estimate; unverified against actual travel times",
                    geometry_basis="Straight links between GTFS stops; not road-following shapes",
                )
            )
        ranked = rank_journeys(results, mode)
        # Limit repeated departures of the same path in default alternatives.
        unique = []
        paths = set()
        for j in ranked:
            path = tuple(
                (l["pattern_id"], l["origin"]["id"], l["destination"]["id"])
                for l in j["legs"]
            )
            if path not in paths:
                unique.append(j)
                paths.add(path)
            if len(unique) == 5:
                break
        return unique
