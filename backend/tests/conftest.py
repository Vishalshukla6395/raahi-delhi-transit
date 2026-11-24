"""Small synthetic GTFS fixtures for correctness only; never served in the application."""

import csv
import pytest
from raahi.network import Network


@pytest.fixture
def gtfs_dir(tmp_path):
    def write(name, fields, rows):
        with (tmp_path / name).open("w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(fields)
            w.writerows(rows)

    write(
        "stops.txt",
        ["stop_id", "stop_name", "stop_lat", "stop_lon"],
        [
            ["A", "Alpha Stop", 28.60, 77.20],
            ["B", "Beta Stop", 28.61, 77.21],
            ["C", "Gamma Stop", 28.62, 77.22],
            ["D", "Delta Stop", 28.63, 77.23],
            ["E", "End Stop", 28.64, 77.24],
        ],
    )
    write(
        "routes.txt",
        ["route_id", "route_short_name", "route_long_name", "route_type"],
        [
            ["r1", "1UP", "1 UP", "3"],
            ["r2", "2UP", "2 UP", "3"],
            ["r3", "1DOWN", "1 DOWN", "3"],
        ],
    )
    write(
        "trips.txt",
        ["route_id", "service_id", "trip_id", "direction_id"],
        [
            ["r1", "daily", "t1", "0"],
            ["r2", "daily", "t2", "0"],
            ["r3", "daily", "t3", "1"],
            ["r1", "daily", "night", "0"],
        ],
    )
    rows = []
    for tid, stops, times in [
        ("t1", ["A", "B", "C", "D"], ["08:00:00", "08:10:00", "08:20:00", "08:30:00"]),
        ("t2", ["C", "E"], ["08:27:00", "08:40:00"]),
        ("t3", ["D", "C", "B", "A"], ["08:00:00", "08:10:00", "08:20:00", "08:30:00"]),
        (
            "night",
            ["A", "B", "C", "D"],
            ["25:00:00", "25:10:00", "25:20:00", "25:30:00"],
        ),
    ]:
        rows += [[tid, t, t, s, i] for i, (s, t) in enumerate(zip(stops, times))]
    write(
        "stop_times.txt",
        ["trip_id", "arrival_time", "departure_time", "stop_id", "stop_sequence"],
        rows,
    )
    write(
        "calendar.txt",
        [
            "service_id",
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
            "start_date",
            "end_date",
        ],
        [["daily", 1, 1, 1, 1, 1, 1, 1, 20260101, 20261231]],
    )
    write(
        "calendar_dates.txt",
        ["service_id", "date", "exception_type"],
        [["daily", 20261124, 2]],
    )
    return tmp_path


@pytest.fixture
def network(gtfs_dir):
    return Network(gtfs_dir)
