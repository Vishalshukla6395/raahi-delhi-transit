from datetime import datetime
import pytest
from raahi.domain import (
    parse_timestamp,
    valid_passengers,
    gtfs_seconds,
    segment_indices,
    normalize,
)


@pytest.mark.parametrize(
    "stamp", ["bad", "2026-10-01T08:00:00", "2026-99-90T12:00:00+05:30"]
)
def test_bad_timestamps(stamp):
    with pytest.raises(ValueError):
        parse_timestamp(stamp)


def test_timezone_rollover():
    dt = parse_timestamp("2026-10-01T20:00:00Z")
    assert dt.day == 2 and dt.hour == 1 and dt.minute == 30


@pytest.mark.parametrize("value", [None, "", 0, -1, 1.5, "NaN", "inf"])
def test_invalid_passengers(value):
    assert not valid_passengers(value)


@pytest.mark.parametrize("value", [1, "2", 20])
def test_valid_counts(value):
    assert valid_passengers(value)


def test_segment_expansion():
    assert segment_indices(0, 3) == [0, 1, 2]
    with pytest.raises(ValueError):
        segment_indices(3, 0)


def test_gtfs_after_midnight():
    assert gtfs_seconds("25:10:00") == 90600
    with pytest.raises(ValueError):
        gtfs_seconds("08:61:00")


def test_normalization_preserves_direction():
    assert normalize("1 UP") == normalize("1-up")
    assert normalize("1UP") != normalize("1DOWN")
