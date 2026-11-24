"""Full segment pipeline integration on explicitly synthetic, isolated input."""

import json
from datetime import datetime
import inspect
import pandas as pd
from raahi import pipeline
from raahi.domain import IST
from raahi.network import Network
from raahi.model import DemandModel
from raahi.planner import Planner


def test_default_network_scope_matches_reproducible_cli_default():
    assert inspect.signature(pipeline.network_pipeline).parameters["max_patterns"].default == 100


def test_od_to_segments_to_predicted_journey(gtfs_dir, tmp_path, monkeypatch):
    base = tmp_path / "isolated_pipeline"
    processed = base / "processed"
    reports = base / "reports"
    for p in (processed, reports, base / "docs/data"):
        p.mkdir(parents=True)
    for name, path in [("PROCESSED", processed), ("REPORTS", reports), ("ROOT", base)]:
        monkeypatch.setattr(pipeline, name, path)
    rows = [
        dict(
            route_key="1up",
            start_stop_name="Alpha Stop",
            end_stop_name="Delta Stop",
            date=f"2026-10-{d:02}",
            bucket15=32,
            day_type=int(datetime(2026, 10, d).weekday() >= 5),
            passengers=2,
            tickets=1,
        )
        for d in range(1, 32)
    ]
    rows.append({**rows[0], "route_key": "unknown"})
    pd.DataFrame(rows).to_parquet(processed / "od_daily.parquet", index=False)
    (reports / "validation.json").write_text('{"selected_minutes":30}')
    result = pipeline.network_pipeline(gtfs_dir)
    assert result["status"] == "ready" and result["matched_tickets"] == 31
    assert result["matching_coverage"] == 31 / 32
    features = pd.read_parquet(processed / "segment_daily.parquet")
    assert len(features) == 31 * 3 and features["passengers"].sum() == 31 * 3 * 2
    assert (
        json.loads((reports / "private/unmatched-od.json").read_text())[0]["reason"]
        == "unknown_route"
    )
    network = Network.from_dict(json.loads((processed / "network.json").read_text()))
    model = DemandModel(json.loads((processed / "segment-model.json").read_text()))
    journeys = Planner(network, model).search(
        "A", "D", datetime(2026, 11, 23, 7, 55, tzinfo=IST), transfers=False
    )
    assert journeys[0]["prediction_coverage"] == 1
    assert all(
        s["prediction"]["expected"] == 2 for s in journeys[0]["legs"][0]["segments"]
    )
    assert (reports / "segment-validation.json").exists()
    # A failed rebuild must not leave validation from the old network visible.
    result = pipeline.network_pipeline(base / "missing.zip")
    assert result["status"] == "blocked"
    assert not (reports / "segment-validation.json").exists()
    assert not (processed / "network.json").exists()
    assert not (processed / "segment-model.json").exists()
