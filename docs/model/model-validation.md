# Model validation

Executed on all valid October ticket records. This is validation of a transaction-derived demand proxy, not occupancy accuracy.

Chronological first 75% of source dates train the candidate models; remaining dates are validation. No random split. The same validation period selects time-bin width, so it is not an untouched final test set.

Baseline: each route's training-period mean across all bins. Candidate: day-type/time-slot mean shrunk toward the all-day slot mean with three pseudo-days. Zero bins are included.

| Bin | Model | MAE (sampled passengers/bin) | WAPE | Spearman rank | Cells |
|---|---|---:|---:|---:|---:|
| 15 min | baseline | 0.517 | 1.2003 | 0.4391 | 1734912 |
| 15 min | seasonal | 0.3232 | 0.7502 | 0.6023 | 1734912 |
| 30 min | baseline | 0.942 | 1.0935 | 0.4966 | 867456 |
| 30 min | seasonal | 0.5068 | 0.5883 | 0.6825 | 867456 |

Selected bin: 30 minutes using lower WAPE. MAE across different bin widths is not directly comparable.

Train dates: 2026-10-01, 2026-10-02, 2026-10-03, 2026-10-04, 2026-10-05, 2026-10-06, 2026-10-07, 2026-10-08, 2026-10-09, 2026-10-10, 2026-10-11, 2026-10-12, 2026-10-13, 2026-10-14, 2026-10-15, 2026-10-16, 2026-10-17, 2026-10-18, 2026-10-19, 2026-10-20, 2026-10-21, 2026-10-22, 2026-10-23

Validation dates: 2026-10-24, 2026-10-25, 2026-10-26, 2026-10-27, 2026-10-28, 2026-10-29, 2026-10-30, 2026-10-31

The deployed profile is refit on all source dates. WAPE over 100% is mathematically possible when summed absolute error exceeds the total sampled target; zero-heavy sparse cells and a constant all-bin baseline contribute here. The baseline is intentionally simple and should not stand alone as the innovation claim. Segment validation adds a same-time-slot baseline and two consecutive-week diagnostics in `segment-validation.md`. Route profiles include no service denominator. Future-date predictions assume October weekly patterns persist; holidays, disruptions and seasonality are unknown. Physical occupancy remains unvalidated.
