from datetime import datetime
import pytest
from raahi.domain import IST
from raahi.planner import Planner, rank_journeys

WHEN = datetime(2026, 11, 23, 7, 55, tzinfo=IST)


def test_direct_route_with_missing_predictions(network):
    results = Planner(network).search("A", "D", WHEN, transfers=False)
    assert results and results[0]["duration_minutes"] == 35
    assert results[0]["demand_index"] is None
    assert results[0]["prediction_coverage"] == 0
    assert len(results[0]["legs"][0]["segments"]) == 3


def test_real_transfer_constraints(network):
    results = Planner(network).search("A", "E", WHEN)
    assert results and results[0]["transfers"] == 1
    assert results[0]["duration_minutes"] == 45
    assert (
        results[0]["legs"][0]["destination"]["id"]
        == results[0]["legs"][1]["origin"]["id"]
        == "C"
    )
    assert not Planner(network).search("A", "E", WHEN, transfers=False)


def test_direction_calendar_empty(network):
    assert not Planner(network).search("E", "A", WHEN)
    assert not Planner(network).search("A", "D", WHEN.replace(day=24))


def test_after_midnight_service_date(network):
    results = Planner(network).search(
        "A", "D", datetime(2026, 11, 24, 0, 55, tzinfo=IST), transfers=False
    )
    assert (
        results and results[0]["duration_minutes"] == 35
    )  # previous service day, 25:00


def test_invalid_input(network):
    with pytest.raises(ValueError):
        Planner(network).search("bad", "D", WHEN)
    with pytest.raises(ValueError):
        Planner(network).search("A", "A", WHEN)


def test_ranking_never_rewards_unknown():
    def journey(duration, index, coverage=1):
        return dict(
            duration_minutes=duration,
            demand_index=index,
            prediction_coverage=coverage,
            transfers=0,
        )

    values = [journey(30, None, 0), journey(32, 20), journey(100, 0)]
    ranked = rank_journeys(values, "less_crowded")
    assert ranked[0]["demand_index"] == 20
    assert all(j["duration_minutes"] < 100 for j in ranked)


def test_transfer_minimum_and_pickup_restrictions(network):
    p = next(p for p in network.patterns.values() if p["name"] == "2UP")
    p["trips"][0]["departures"][0] = 8 * 3600 + 22 * 60
    assert not Planner(network).search("A", "E", WHEN)
    p = next(p for p in network.patterns.values() if p["name"] == "1UP")
    p["trips"][0]["pickup"][0] = "1"
    assert not Planner(network).search("A", "D", WHEN, transfers=False)
