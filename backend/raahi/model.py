"""Transparent seasonal means with chronological validation on sampled demand."""

import json
from bisect import bisect_right
from datetime import datetime
import numpy as np
import pandas as pd


def metrics(actual, predicted):
    a, p = np.asarray(actual, dtype=float), np.asarray(predicted, dtype=float)
    if not len(a):
        return dict(mae=None, wape=None, rank_correlation=None, cells=0)
    error = np.abs(a - p)
    rank = (
        pd.Series(a).rank().corr(pd.Series(p).rank())
        if np.std(p) > 0 and np.std(a) > 0
        else None
    )
    return dict(
        mae=round(float(error.mean()), 4),
        wape=round(float(error.sum() / a.sum()), 4) if a.sum() else None,
        rank_correlation=round(float(rank), 4)
        if rank is not None and np.isfinite(rank)
        else None,
        cells=len(a),
    )


def dense_history(frame, dates, minutes):
    f = frame.copy()
    f["bucket"] = (f["bucket15"] // (minutes // 15)).astype(int)
    grouped = f.groupby(["date", "bucket"])[["passengers", "tickets"]].sum()
    index = pd.MultiIndex.from_product(
        [dates, range(1440 // minutes)], names=["date", "bucket"]
    )
    return (
        grouped.reindex(index, fill_value=0)
        .to_numpy(dtype=float)
        .reshape(len(dates), 1440 // minutes, 2)
    )


def fit(frame, minutes=30, strategy="seasonal"):
    """Rows: key, date, bucket15, passengers, tickets. Missing cells = no observed tickets."""
    if strategy not in {"seasonal", "same_slot"}:
        raise ValueError("strategy must be 'seasonal' or 'same_slot'")
    f = frame.copy()
    f["date"] = pd.to_datetime(f["date"]).dt.strftime("%Y-%m-%d")
    dates = sorted(f["date"].unique())
    types = np.array([int(datetime.fromisoformat(d).weekday() >= 5) for d in dates])
    split = max(1, int(len(dates) * 0.75))
    train = np.arange(len(dates)) < split
    models = {}
    actual = []
    base_pred = []
    same_slot_pred = []
    seasonal_pred = []
    for key, g in f.groupby("key", sort=True):
        dense = dense_history(g, dates, minutes)
        y = dense[:, :, 0]
        tickets = dense[:, :, 1]
        train_y = y[train]
        train_types = types[train]
        baseline = float(train_y.mean())
        mean_slot = train_y.mean(axis=0)
        seasonal = {
            t: np.where(
                np.count_nonzero(train_y[train_types == t], axis=0) >= 3,
                (train_y[train_types == t].sum(axis=0) + 3 * mean_slot)
                / (sum(train_types == t) + 3),
                mean_slot,
            )
            for t in (0, 1)
        }
        for i in np.where(~train)[0]:
            actual.extend(y[i])
            base_pred.extend([baseline] * y.shape[1])
            same_slot_pred.extend(mean_slot)
            seasonal_pred.extend(seasonal[types[i]])
        slots = {}
        for t in (0, 1):
            group = y[types == t]
            counts = tickets[types == t]
            for b in range(y.shape[1]):
                series = group[:, b]
                tc = counts[:, b]
                positive = int(np.count_nonzero(series))
                seasonal_backoff = positive < 3
                if seasonal_backoff:
                    series = y[:, b]
                    tc = tickets[:, b]
                n = len(series)
                seasonal_estimate = (
                    float((group[:, b].sum() + 3 * y[:, b].mean()) / (len(group) + 3))
                    if not seasonal_backoff
                    else float(series.mean())
                )
                same_slot_estimate = float(y[:, b].mean())
                if strategy == "same_slot":
                    series = y[:, b]
                    tc = tickets[:, b]
                    n = len(series)
                    positive = int(np.count_nonzero(series))
                used_fallback = seasonal_backoff if strategy == "seasonal" else False
                estimate = same_slot_estimate if strategy == "same_slot" else seasonal_estimate
                observed = int(np.count_nonzero(series))
                total_tickets = int(tc.sum())
                cv = float(series.std() / max(series.mean(), 0.01))
                grade = (
                    "moderate"
                    if observed >= 6 and total_tickets >= 30 and cv <= 1 and not used_fallback
                    else "limited"
                )
                if observed == 0:
                    grade = "unavailable"
                slots[f"{t}:{b}"] = dict(
                    expected=round(estimate, 3),
                    same_slot_expected=round(same_slot_estimate, 3),
                    seasonal_expected=round(seasonal_estimate, 3),
                    observed_days=observed,
                    calendar_days=n,
                    tickets=total_tickets,
                    evidence=grade,
                    backoff="all-days same time slot"
                    if strategy == "same_slot" or seasonal_backoff
                    else "day-type and time slot",
                    historical_range=[
                        round(float(np.quantile(series, 0.1)), 3),
                        round(float(np.quantile(series, 0.9)), 3),
                    ]
                    if n
                    else None,
                    variability=round(cv, 3),
                )
        values = sorted(v["expected"] for v in slots.values() if v["expected"] > 0)
        models[str(key)] = dict(
            slots=slots,
            reference=values,
            tickets=int(tickets.sum()),
            observed_days=int(np.count_nonzero(y.sum(axis=1))),
        )
    evaluation = dict(
        minutes=minutes,
        train_dates=dates[:split],
        validation_dates=dates[split:],
        target="Observed e-ticket passenger demand per time bin; not physical occupancy",
        baseline=metrics(actual, base_pred),
        same_slot=metrics(actual, same_slot_pred),
        seasonal=metrics(actual, seasonal_pred),
        zero_cell_policy="All dates present in the source and all daily bins included; zero means no observed sampled tickets, not no passengers.",
    )
    return dict(
        minutes=minutes,
        strategy=strategy,
        first_date=dates[0],
        last_date=dates[-1],
        models=models,
        evaluation=evaluation,
    )


class DemandModel:
    def __init__(self, data):
        self.data = data

    def predict(self, key, when):
        model = self.data["models"].get(key)
        if not model:
            return dict(
                index=None,
                category="Unavailable",
                evidence="unavailable",
                expected=None,
                observed_days=0,
                tickets=0,
                backoff="no matched history",
                historical_range=None,
            )
        bucket = (when.hour * 60 + when.minute) // self.data["minutes"]
        value = model["slots"][f"{int(when.weekday() >= 5)}:{bucket}"].copy()
        if value["evidence"] == "unavailable":
            value.update(index=None, category="Unavailable")
        else:
            reference = self.data.get("global_reference") or model["reference"]
            index = (
                round(100 * bisect_right(reference, value["expected"]) / len(reference))
                if reference
                else None
            )
            value.update(
                index=index,
                category=(
                    "Lower demand"
                    if index <= 25
                    else "Typical demand"
                    if index <= 50
                    else "Higher demand"
                    if index <= 75
                    else "Highest demand"
                )
                if index is not None
                else "Unavailable",
            )
        value["historical_through"] = self.data["last_date"]
        value["definition"] = (
            "Percentile of expected sampled demand; not percent of vehicle capacity"
        )
        return value
