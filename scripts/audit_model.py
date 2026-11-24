"""Additional fixed-protocol diagnostics; no model tuning or occupancy claims."""
import json
from pathlib import Path
import numpy as np
import pandas as pd
from raahi.model import dense_history, metrics

ROOT = Path(__file__).resolve().parents[1]


def evaluate(frame, cutoff, end):
    f = frame.copy()
    f['date'] = pd.to_datetime(f.date).dt.strftime('%Y-%m-%d')
    dates = sorted(f.date.unique())
    train = np.array([d <= cutoff for d in dates])
    test = np.array([cutoff < d <= end for d in dates])
    types = np.array([pd.Timestamp(d).day_of_week >= 5 for d in dates])
    # Only keys observed before the cutoff are eligible. Segment universe remains
    # conditional on the original full-month corridor selection, disclosed below.
    keys = set(f.loc[f.date <= cutoff, 'key'])
    actual, predictions = [], {k: [] for k in ('constant', 'same_slot', 'seasonal', 'previous_week')}
    pairs = {name: dict(correct=0, wrong=0, predicted_ties=0, actual_ties=0)
             for name in predictions}
    daily = {}
    for key, g in f[f.key.isin(keys)].groupby('key', sort=True):
        y = dense_history(g, dates, 30)[:, :, 0]
        tr = y[train]
        slot = tr.mean(axis=0)
        seasonal = {t: np.where(np.count_nonzero(tr[types[train] == t], axis=0) >= 3,
                     (tr[types[train] == t].sum(axis=0) + 3 * slot) / (sum(types[train] == t) + 3), slot) for t in (False, True)}
        for i in np.where(test)[0]:
            preds = dict(constant=np.full(48, tr.mean()), same_slot=slot,
                         seasonal=seasonal[types[i]], previous_week=y[i-7])
            actual.extend(y[i])
            for name, p in preds.items():
                predictions[name].extend(p)
            d = daily.setdefault(dates[i], dict(actual=0., seasonal_error=0., slot_error=0.))
            d['actual'] += float(y[i].sum())
            d['seasonal_error'] += float(np.abs(y[i]-preds['seasonal']).sum())
            d['slot_error'] += float(np.abs(y[i]-slot).sum())
            # Same key, +30/+60 minutes, 06:00-22:00. Compare every predictor
            # with the observed within-segment demand ordering. Actual ties are
            # excluded; predicted ties earn half credit.
            for name, prediction in preds.items():
                for lag in (1, 2):
                    a = y[i, 12:44-lag] - y[i, 12+lag:44]
                    p = prediction[12:44-lag] - prediction[12+lag:44]
                    stat = pairs[name]
                    stat['actual_ties'] += int((a == 0).sum())
                    mask = a != 0
                    stat['correct'] += int(((a*p > 0) & mask).sum())
                    stat['wrong'] += int(((a*p < 0) & mask).sum())
                    stat['predicted_ties'] += int(((p == 0) & mask).sum())
    for stat in pairs.values():
        n = stat['correct']+stat['wrong']+stat['predicted_ties']
        stat['accuracy_with_half_credit_for_prediction_ties'] = round((stat['correct']+.5*stat['predicted_ties'])/n,4) if n else None
        stat['eligible_pairs'] = n
    return dict(train_end=cutoff, validation_end=end, keys=len(keys),
                metrics={k: metrics(actual,v) for k,v in predictions.items()},
                within_key_departure_ranking=pairs,
                daily={d:dict(wape=round(v['seasonal_error']/v['actual'],4),same_slot_wape=round(v['slot_error']/v['actual'],4)) for d,v in daily.items() if v['actual']})


def main():
    report = dict(protocol='Fixed 30-minute bins; train through 14 then evaluate 15-21; train through 23 then evaluate 24-31. No retuning. This audit uses previously seen October data and is not an untouched final test.',
                  caveats=['Segment universe was originally selected on full-month volume; segment evaluation remains conditional, even when per-fold keys require training observations.',
                           'Previous-week baseline may use earlier validation outcomes: a rolling operational benchmark, not a frozen forecast.',
                           'Pairwise rows are correlated across dates and neighbouring segments; no binomial confidence interval or occupancy claim.',
                           'WAPE weights high-volume cells. Same-key departure ranking reduces, but cannot remove, sampling and supply confounding.'])
    for scope, file in [('route','route_daily.parquet'), ('segment','segment_daily.parquet')]:
        f = pd.read_parquet(ROOT/'data/processed'/file).rename(columns={'route_key':'key'})
        report[scope] = []
        for cutoff,end in [('2026-10-14','2026-10-21'),('2026-10-23','2026-10-31')]:
            e=evaluate(f,cutoff,end)
            report[scope].append(e)
            print(scope,cutoff,e['metrics'],e['within_key_departure_ranking'],flush=True)
    (ROOT/'data/reports/model-audit.json').write_text(json.dumps(report,indent=2),encoding='utf-8')


if __name__ == '__main__':
    main()
