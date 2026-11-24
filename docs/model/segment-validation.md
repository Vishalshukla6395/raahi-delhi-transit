# Actual segment-demand validation

Executed on the authorised full GTFS and October 2026 tickets, 24 November 2026.

- 819,490 of 2,559,899 tickets match one forward route/stop path (32.01%).
- The production model uses the top 100 of 1,865 patterns with matched data: 388,083 records, 4,769 segment keys, 2,793,293 daily feature rows.
- The 100 patterns contain 47.36% of unambiguous matches, 15.16% of all digital ticket records, and 2.86% of the 3,498 GTFS patterns. These figures are not shares of all bus passengers.
- Independent OD reconciliation reproduces exactly 5,915,129 passenger-segment traversals. These are not unique passengers or measured onboard loads.
- Train 1-23 October; validate 24-31 October; 30-minute bins were selected by route-level validation. Final artifacts refit on all 31 dates.

| Model | MAE, sampled traversals/bin | WAPE | Spearman rank | Cells |
|---|---:|---:|---:|---:|
| Segment constant-mean baseline | 1.0547 | 118.65% | 0.3442 | 1,831,296 |
| Same-time-slot profile (production) | 0.6218 | 69.96% | 0.6891 | 1,831,296 |
| Seasonal day-type/time comparison | 0.6171 | 69.43% | 0.6889 | 1,831,296 |

WAPE is absolute error divided by the total observed sample. It can exceed 100% when predicted errors exceed the observed total, particularly with many zero or small cells. The constant-mean baseline ignores time of day and is weak. The seasonal profile lowers held-out WAPE by 0.53 percentage points, while the simpler production same-slot profile is marginally stronger on two retrospective departure-order diagnostics.

## Week-to-week stability diagnostic

The following fixed 30-minute diagnostics train on 1-14 October and evaluate 15-21 October, then train on 1-23 October and evaluate 24-31 October. This post-hoc analysis is a useful stability check, but is not an untouched pre-registered final evaluation. Corridor selection still uses full-month volume.

| Segment evaluation dates | Same-slot WAPE | Day-type/time WAPE | Within-pattern +30/+60-minute ordering agreement |
|---|---:|---:|---:|
| 15-21 October | 82.37% | 83.10% | 62.06% (same-slot) / 61.82% (seasonal) |
| 24-31 October | 69.96% | 69.43% | 64.11% (same-slot) / 63.83% (seasonal) |

Ordering agreement uses same-pattern segment pairs at +30 and +60 minutes from 06:00-22:00. Actual ties are excluded; predicted ties receive half credit. There are 1,002,686 and 1,251,083 eligible pair rows respectively. Neighbouring segments and dates are correlated, so these counts are not independent samples and do not support confidence intervals. This is sampled-ticket-demand ordering, not comfort or occupancy accuracy.

The seasonal day-type component does not consistently beat same-slot history. The production predictor therefore uses the simpler same-slot mean. These close, post-hoc results support a cautious engineering choice, not a validated crowd forecast. Zero cells mean no observed sampled demand, not empty buses. Neither metric validates physical crowding, travel time or seats.

The evaluation corridor list was selected using full-month ticket volume, including the validation dates. Metrics are therefore conditional on the selected 100 patterns, not a network-wide or future-pattern generalisation estimate. Ticket adoption, missing vehicle identifiers, trip assignment, fare inclusion, bus supply and transaction-time uncertainty limit comparison across routes.

## Real illustration, not a representative benefit claim

A deterministic search of 100 covered patterns, three origin positions and four weekday times tested 1,200 direct candidates. One example had complete segment coverage and Moderate evidence on both routes: Hamdard Nagar / Sangam Vihar to Badarpur M B Road / Rajiv Gandhi Stadium on 24 November at 20:00. The fastest option was 717ADOWN (19 minutes, demand index 99); the less-crowded option was 544UP (23 minutes, index 84). This is a four-minute scheduled trade-off and 15 index points, not a measured 15% passenger or occupancy reduction. Different ticket adoption and vehicle frequency can explain part or all of the difference. It is a discovered demonstration case, not a representative impact estimate.

Evidence: `data/reports/segment-validation.json`, `segment-reconciliation.json`, `network-quality.json`, `pattern-coverage-audit.json`, `model-audit.json`, `tradeoff-examples.json`. Reproduce matching with `python -m raahi.cli network --max-patterns 100`, reconciliation with `python scripts/audit_network.py`, and diagnostics with `python scripts/audit_model.py` and `python scripts/find_tradeoffs.py`.
