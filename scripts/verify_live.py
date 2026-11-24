"""Read-only HTTP checks of the actual local data-backed API; stores aggregate evidence."""

import json
import statistics
import time
import httpx
from pathlib import Path

root = Path(__file__).resolve().parents[1]
with httpx.Client(base_url="http://127.0.0.1:8000", timeout=30) as c:
    overview = c.get("/api/v1/analytics/overview")
    overview.raise_for_status()
    o = overview.json()
    route = o["quality"]["top_routes"][0]["id"]
    runs = []
    for _ in range(10):
        t = time.perf_counter()
        r = c.get(
            "/api/v1/crowding/route-profile",
            params={"route": route, "date": "2026-11-23"},
        )
        r.raise_for_status()
        runs.append((time.perf_counter() - t) * 1000)
    p = r.json()
    assert len(p["points"]) == 1440 // p["bin_minutes"]
    assert any(v["expected"] > 0 for v in p["points"])
    assert all(v["index"] is None or 0 <= v["index"] <= 100 for v in p["points"])
    invalid = c.post(
        "/api/v1/journeys/search",
        json={"origin": "a", "destination": "b", "departure": "2026-11-23T08:00:00"},
    )
    assert invalid.status_code == 422
    blocked = c.post(
        "/api/v1/journeys/search",
        json={
            "origin": "a",
            "destination": "b",
            "departure": "2026-11-23T08:00:00+05:30",
        },
    )
    if o["network"]["status"] != "ready":
        assert blocked.status_code == 503
    result = {
        "http_checks": "PASS",
        "actual_ticket_records": o["quality"]["total_records"],
        "route": route,
        "profile_points": len(p["points"]),
        "profile_latency_ms_median": round(statistics.median(runs), 2),
        "profile_latency_ms_max": round(max(runs), 2),
        "latency_scope": "10 localhost HTTP requests; not a load benchmark",
        "routing_ready": o["network"]["status"] == "ready",
        "invalid_timezone_status": invalid.status_code,
        "journey_status": blocked.status_code,
        "browser_verified": False,
    }
    (root / "data/reports/http-verification.json").write_text(
        json.dumps(result, indent=2), encoding="utf-8"
    )
    print(json.dumps(result, indent=2))
