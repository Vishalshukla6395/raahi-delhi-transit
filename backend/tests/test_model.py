from datetime import datetime
import pandas as pd
from raahi.model import fit, DemandModel, metrics, dense_history
from raahi.domain import IST


def sample():
    return pd.DataFrame(
        [
            dict(
                key="r",
                date=f"2026-10-{day:02}",
                bucket15=32,
                passengers=day,
                tickets=day,
            )
            for day in range(1, 32)
        ]
    )


def test_chronological_split_and_zero_bins():
    model = fit(sample(), 30)
    e = model["evaluation"]
    assert e["train_dates"][-1] == "2026-10-23"
    assert e["validation_dates"][0] == "2026-10-24"
    assert e["baseline"]["cells"] == 8 * 48
    assert e["same_slot"]["cells"] == 8 * 48
    assert e["seasonal"]["mae"] >= 0


def test_sparse_and_missing_history():
    f = sample().iloc[:1]
    m = DemandModel(fit(f, 30))
    p = m.predict("r", datetime(2026, 11, 23, 8, tzinfo=IST))
    assert p["evidence"] == "limited" and p["backoff"] == "all-days same time slot"
    assert m.predict("r", datetime(2026, 11, 23, 3, tzinfo=IST))["index"] is None
    assert m.predict("unknown", datetime(2026, 11, 23, 8, tzinfo=IST))["index"] is None


def test_counts_not_rows_and_output():
    m = DemandModel(fit(sample(), 30))
    p = m.predict("r", datetime(2026, 11, 23, 8, tzinfo=IST))
    assert p["expected"] > 1 and 0 <= p["index"] <= 100
    assert p["tickets"] > p["observed_days"]
    assert "capacity" in p["definition"]


def test_no_future_leakage():
    a = sample()
    b = a.copy()
    b.loc[b["date"] > "2026-10-23", "passengers"] = 1000
    ea = fit(a)["evaluation"]
    eb = fit(b)["evaluation"]
    # Both evaluate the same number of holdout cells; changing test targets must increase error.
    assert eb["baseline"]["mae"] > ea["baseline"]["mae"]
    assert eb["seasonal"]["mae"] > ea["seasonal"]["mae"]


def test_same_slot_strategy_uses_identical_weekday_and_weekend_profile():
    fitted = fit(sample(), 30, strategy="same_slot")
    model = DemandModel(fitted)
    monday = model.predict("r", datetime(2026, 11, 23, 8, tzinfo=IST))
    saturday = model.predict("r", datetime(2026, 11, 28, 8, tzinfo=IST))
    assert fitted["strategy"] == "same_slot"
    assert monday["expected"] == saturday["expected"]
    assert monday["index"] == saturday["index"]
    assert monday["backoff"] == "all-days same time slot"
    assert fitted["models"]["r"]["slots"]["0:16"]["same_slot_expected"] == monday["expected"]


def test_rejects_unknown_prediction_strategy():
    import pytest

    with pytest.raises(ValueError, match="strategy"):
        fit(sample(), 30, strategy="fancy_ml")


def test_zero_wape_safe():
    assert metrics([0, 0], [0, 0])["wape"] is None
