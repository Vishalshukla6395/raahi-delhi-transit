import csv
import json
import duckdb
from raahi import ingest as module


def test_literal_nulls_duplicates_and_invalid_diagnostics(tmp_path, monkeypatch):
    raw = tmp_path / "raw"
    processed = tmp_path / "processed"
    reports = tmp_path / "reports"
    for p in (raw / "tickets", processed, reports, tmp_path / "docs/data"):
        p.mkdir(parents=True)
    for name, value in [
        ("RAW", raw),
        ("PROCESSED", processed),
        ("REPORTS", reports),
        ("ROOT", tmp_path),
    ]:
        monkeypatch.setattr(module, name, value)
    headers = [
        "passenger_count",
        "amount",
        "vehicle_number",
        "ticket_type_id",
        "end_stop_name",
        "route",
        "start_stop_name",
        "created_at",
        "is_ac",
    ]
    valid = [
        2,
        10,
        "NULL",
        1,
        "Delta Stop",
        "1 UP",
        "Alpha Stop",
        "2026-10-01 20:00:00+00:00",
        "True",
    ]
    rows = [valid, valid, [None, *valid[1:]], valid[:7] + ["invalid", "True"]]
    with (raw / "tickets/October-Delhi.csv").open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(headers)
        w.writerows(rows)
    module.ingest()
    q = json.loads((reports / "data-quality.json").read_text())
    assert q["total_records"] == 4 and q["valid_records"] == 2
    assert q["exact_duplicate_surplus"] == 1  # retained because no transaction IDs
    assert q["vehicle_available"] == 0 and q["missing_values"]["vehicle_number"] == 4
    assert q["coverage"]["sampled_passengers"] == 4
    assert q["coverage"]["first_date"] == "2026-10-02"  # IST rollover
    assert q["invalid_passenger_counts"] == 1 and q["invalid_timestamps"] == 1
    con = duckdb.connect()
    assert (
        con.execute(
            "select count(*) from read_parquet(?)",
            [str(reports / "private/invalid-records.parquet")],
        ).fetchone()[0]
        == 2
    )
