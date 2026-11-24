import csv
from datetime import date
import pytest
from raahi.network import Network


def test_alias_and_order(network):
    match, status = network.match("1 UP", "Alpha-stop", "Delta Stop")
    assert status == "matched" and match[1:] == (0, 3)
    assert network.match("1UP", "Delta Stop", "Alpha Stop")[0] is None
    assert network.match("1DOWN", "Delta Stop", "Alpha Stop")[1] == "matched"


def test_unknown_and_fuzzy_not_accepted(network):
    assert network.match("ZZ", "Alpha Stop", "Delta Stop")[1] == "unknown_route"
    assert network.match("1UP", "Alfa Stop", "Delta Stop")[0] is None


def test_ambiguous_path_rejected(network):
    pid = next(iter(network.aliases["1up"]))
    network.patterns["duplicate"] = {**network.patterns[pid], "id": "duplicate"}
    network.aliases["1up"].add("duplicate")
    assert network.match("1UP", "Alpha Stop", "Delta Stop")[1] == "ambiguous_path"


def test_service_calendars(network):
    assert network.active("daily", date(2026, 11, 23))
    assert not network.active("daily", date(2026, 11, 24))
    assert not network.active("daily", date(2027, 1, 1))
    pid = next(iter(network.aliases["1up"]))
    assert network.scheduled_services(pid, 0, date(2026, 11, 23), 16, 30) == 1
    assert network.scheduled_services(pid, 0, date(2026, 11, 24), 16, 30) == 0


def test_broken_sample_is_rejected(gtfs_dir):
    path = gtfs_dir / "stop_times.txt"
    path.write_text(path.read_text().replace("t1", "missing_trip"))
    with pytest.raises(ValueError, match="Disconnected GTFS"):
        Network(gtfs_dir)


def test_duplicate_stop_names_ambiguous(network):
    network.stops["B"]["name"] = "Alpha Stop"
    assert network.match("1UP", "Alpha Stop", "Delta Stop")[1] == "ambiguous_path"
