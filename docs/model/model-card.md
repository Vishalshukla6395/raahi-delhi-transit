# Model card: RAAHI historical sampled demand v0.1

**Status:** route and segment models fitted and evaluated on real October data and the authorised full GTFS. The segment scope is the top 100 of 1,865 patterns with matched ticket data: 4,769 segment keys and 388,083 ticket records. This represents 47.36% of matched tickets and 15.16% of all archive records, covering 2.86% of all 3,498 GTFS patterns. This is not an occupancy model.

## Inputs and target

Official 1-31 October 2026 ONDC bus e-ticket CSV: passenger_count, route, start/end stop names, created_at, vehicle_number and auxiliary fare/type/AC columns. Use positive integer passenger counts and explicit timestamp offsets converted to Asia/Kolkata. Missing vehicle IDs are legitimate missing values, not bus identities. Route history is passenger-weighted transaction demand per date and bin.

Unique ordered OD matches in the full GTFS expand passenger counts over each consecutive segment. Overall, 819,490 tickets (32.01%) match; 471,150 have ambiguous paths, 1,228,307 unmatched stops/direction and 40,952 unknown route labels. Route patterns distinguish stop sequences and directions. The reproducible default fits the top 100 matched patterns by ticket volume; this is a bounded prototype scope, not a model-confidence cutoff. A coverage audit estimates 18.18% archive-record coverage at top 150, but that larger model has not been validated or adopted. Ambiguity excludes a row from segment training but retains it in diagnostics and route analysis.

## Prediction and backoff

Route profiles use a weekday/weekend and time-bin mean shrunk toward the all-day time-bin mean. Segment profiles use the simpler all-days same-time-slot mean: fixed-window departure-order diagnostics slightly favored it in both weeks, while held-out WAPE slightly favored the seasonal profile. The difference is small and inconclusive, so the prototype uses the simpler method and retains both metrics for comparison. Missing entire histories remain unavailable. Broader route/global segment backoff is intentionally not implemented: boarding totals and segment traversal demand have different units, and pooling them would create false comparability.

Evaluate 15 and 30 minutes; select by lower validation WAPE. Fit final artifacts on the full month. Zero bins are included under the explicit assumption that they mean no observed digital-ticket demand. Source presence does not prove complete ticket capture. No scheduled-service denominator is used until transaction/supply alignment can be justified.

## Outputs

- Expected sampled passengers in a time bin.
- Relative Demand Index 0-100: empirical percentile of fitted positive expected values. This is not percentage capacity. UI labels are lower, typical, higher and highest demand; these are not seat or comfort categories. Zero-evidence cells show unavailable.
- Route explorer uses a separate within-route reference. Its indices must not rank physical crowding across routes.
- The segment model uses a shared modeled-segment reference; it remains susceptible to different ticketing penetration and service supply across routes.
- The four UI categories use percentile quartiles of that empirical reference. These are descriptive relative-demand categories, not validated comfort or seat categories.
- Evidence: observed non-zero days, ticket count, fallback source, variability and descriptive historical 10th-90th percentile range. That range is not a forecast interval.

## Evidence grade

Moderate requires at least six non-zero days and 30 ticket records, coefficient of variation <=1, and no fallback. Other supported estimates are Limited. No supporting history is Unavailable. These thresholds are product heuristics, not calibrated coverage probabilities. Sparse route profiles cannot imply strong segment evidence.

## Validation

See [executed metrics](model-validation.md) and `data/reports/validation.json`. Training is 1-23 October; validation is 24-31 October. Validation also selects bin width. The production segment profile uses all-days same-time-slot history. On 1,831,296 selected-scope cells it has MAE 0.6218, WAPE 69.96% and rank correlation 0.6891. The seasonal comparison has MAE 0.6171, WAPE 69.43% and rank correlation 0.6889; the difference is small. On retrospective fixed-window checks, same-slot WAPE is 82.37% and 69.96%, versus 83.10% and 69.43% for seasonal. Same-slot departure-order agreement is marginally higher in both windows (62.06% vs 61.82%; 64.11% vs 63.83%), on correlated pairs. This supports a simpler production choice, not a validated comfort benefit. Pattern selection uses full-month volume, so metrics are conditional on the selected scope. See [segment validation](segment-validation.md). No APC, physical census or separate ETM ground truth is available.

## Bias, appropriate use and limitations

The official Problem 2 brief requests ticketing and ETM data, but the accessible October archive used here is the ONDC e-ticket sample. App-ticket users may differ from pass holders and cash/ETM users; the data README says about half the rows lack a vehicle number. Fare, route and demographic adoption can vary. Ticket creation can precede or follow boarding, and declared alighting can be wrong. No vehicle-service assignment, capacity, calibrated uncertainty or physical load was validated. One month misses seasons and disruptions; weekday/weekend does not model holidays. Future-date outputs reuse October patterns and are not live predictions.

Appropriate use: exploratory comparison of historical digital-ticket demand and prototype decision support. Inappropriate use: occupancy enforcement, guaranteed access/seating, safety decisions or operator service cuts based solely on these proxies.
