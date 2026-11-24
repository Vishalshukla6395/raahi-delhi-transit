# RAAHI technical note

Version 0.2 | 24 November 2026 | Historical sampled-demand prototype

## Implementation status

Real ticket ingestion, full authorised GTFS import, route/segment validation and Delhi journey search are complete. HTTP and React-to-API integration use actual data. The rejected disconnected public sample is not used. Headless Chrome checks pass at desktop and mobile viewport sizes. An actual app recording accompanies the package. Physical occupancy and physical-device testing remain unverified.

## Inputs and schemas

The official CSV supplies passenger_count, amount, vehicle_number, ticket_type_id, end_stop_name, route, start_stop_name, created_at and is_ac. The archive SHA-256 is `3b0d051b13a7082697df1c0f03140611350e50b574b44e21d1fb62d4f23df7be`.

DuckDB stores typed timestamps in Asia/Kolkata, positive integer passenger counts, date, day type and 15-minute bucket. Aggregated Parquet contains route or OD key, date, bucket15, day_type, passengers and ticket count. Raw transactions and diagnostic rows stay private and ignored by Git. API artifacts exclude vehicle identifiers.

## Actual data quality

The full file has 2,559,899 records, all structurally valid under the documented validation rules; that does not prove their real-world truth. Passenger-weighted total: 2,753,606. Coverage: 1-31 October 2026, 2,259 normalised route labels, 7,148 boarding-name strings and 6,941 alighting-name strings. Names are not guaranteed unique physical stops.

Vehicle numbers are absent in 1,242,167 records (literal NULL fields); 1,317,732 are available. All other supplied fields have zero missing values under the parser rules. Exact duplicate surplus, invalid timestamps and invalid passenger counts are all zero. AC-labelled records: 2,059,092; non-AC: 500,807. No passenger_count exceeds 20. Route punctuation/case normalisation produced no multi-spelling collisions in this file.

Duplicates are retained if encountered because identical rows need not be duplicate transactions without IDs. Invalid rows and unmatched OD pairs are preserved in private diagnostics. This policy has a regression test for literal NULL, duplicates, invalid counts and timezone rollover.

## Network matching and segment inference

The full feed has 6,862 stops, 2,574 routes, 80,357 trips, 2,737,136 stop-time rows and 3,498 patterns, with zero dangling references, missing stops or rejected trips. The local GTFS SHA-256 is 8eb05d9c21e7a6b42d7b49de45cb095b70ddee5b8f7716859330c9784c322f05; this is an integrity identifier, not a publisher-verified checksum. Validate GTFS stops, routes, trips, stop_times, calendar/calendar_dates and pickup/dropoff restrictions. Parse times greater than 24:00 against the service date. Reject disconnected references, missing calendars and frequency-based feeds; reject malformed trip sequences. Empty direction_id is not guessed: route ID and ordered stop sequence still distinguish patterns.

Match normalised route short/long names, then both stop names within that route pattern. Accept exactly one forward boarding/alighting path. Unknown, reversed, loop-ambiguous or multi-pattern mappings remain unmatched. No automatic fuzzy assignment or arbitrary geographic transfer occurs. Actual outcomes: 819,490 matched tickets (32.01%); 1,228,307 unmatched stops/direction; 471,150 ambiguous paths; 40,952 unknown routes. The selected 100 patterns contain 388,083 ticket records and 4,769 segment keys. Independent OD-to-segment reconciliation exactly reproduces 5,915,129 passenger-segment traversals.

For an A-to-D ticket on A-B-C-D, passenger_count contributes to A-B, B-C and C-D. Aggregate by segment and transaction-time bucket. The primary model does not infer vehicle-specific occupancy or shift downstream ticket demand by an unverified travel-time model. The current model covers the top 100 of 1,865 unambiguously matched patterns: 388,083 digital records, 4,769 segment keys, 15.16% of all archive records and 2.86% of 3,498 GTFS patterns. Other paths expose unavailable predictions.

Scheduled-service counting is implemented and tested, but not used as a model denominator because transaction time is not verified segment traversal time. Missing schedules are not zero supply, and no frequency is invented.

## Historical model and scale

Evaluate 15- and 30-minute grids. Zero-filled cells represent no observed sampled tickets, not empty buses. Route profiles use weekday/weekend buckets. The production segment model uses the simpler mean at each time slot across all available dates; the seasonal weekday/weekend profile is retained as a validation comparison. No history means unavailable. Broad route-total-to-segment fallback is not used because those are different units.

The relative index is a percentile over fitted positive historical estimates. Route explorer references are within-route; the segment model uses a shared reference across selected modeled segments. UI categories say lower, typical, higher and highest demand. They are not physical occupancy or seat labels. Different adoption and service supply prevent unqualified cross-route physical-crowding comparisons.

Evidence grades are heuristic: Moderate requires six non-zero days, 30 ticket records, coefficient of variation at most one and no fallback. Otherwise evidence is Limited, or Unavailable for no support. Descriptive historical 10th-90th percentile ranges are not confidence or prediction intervals.

## Executed chronological validation

Train: 1-23 October. Validation: 24-31 October. The 30-minute window was selected using this original validation period, and the 100 corridors were selected by full-month volume. A separate retrospective fixed-window check is reported below; neither is an untouched prospective test. Deployed artifacts are then refit on all October dates.

| 30-minute segment cells | MAE | WAPE | Rank correlation | Cells |
|---|---:|---:|---:|---:|
| Constant segment mean | 1.0547 | 118.65% | 0.3442 | 1,831,296 |
| Same-time-slot mean (production) | 0.6218 | 69.96% | 0.6891 | 1,831,296 |
| Seasonal weekday/weekend comparison | 0.6171 | 69.43% | 0.6889 | 1,831,296 |

The seasonal profile lowers held-out WAPE by only 0.53 percentage points, while the production same-slot model is simpler. The constant segment-mean baseline ignores daily time structure, so comparison to it overstates the value of the additional model. WAPE can exceed 100% when total absolute error exceeds sampled demand, especially with many zero cells. All targets are ticket-derived demand metrics, not ground-truth occupancy accuracy.

An additional fixed-window check trains through 14 October and evaluates 15-21 October, then trains through 23 October and evaluates 24-31 October. Same-slot/seasonal WAPE is 82.37%/83.10% in the first week and 69.96%/69.43% in the second. Same-pattern +30/+60-minute ordering agreement is 62.06%/61.82% and 64.11%/63.83%, respectively. These small, post-hoc differences vary by metric; pair rows are correlated and do not measure occupancy or comfort. The held-out dates predate this post-hoc audit, and the 100-pattern corridor scope still uses full-month volume.

Aggregate transaction peaks occur at 09:00 (374,218 sampled passengers), 08:00 (334,404), 18:00 (254,896) and 19:00 (239,134). This is consistent with commute-like timing in the observed sample, not independent field validation. Weekday comparisons must divide by the number of each weekday in October; raw totals alone are misleading.

## Journey engine and scoring

Search direct journeys and at most one same-stop transfer. Use operating service dates and actual pickup/dropoff restrictions. Initial departure horizon: two hours; transfer buffer: five minutes; maximum transfer wait: 45 minutes; maximum total journey: four hours. These are explicit prototype search assumptions, not guarantees of interchange facilities. GTFS times are schedule estimates, not live ETAs.

Fastest weights time alone. Balanced uses 0.65 time, 0.25 demand and 0.10 transfers. Less crowded uses 0.25, 0.65 and 0.10. Time is divided by the fastest candidate duration; crowd index by 100. Missing/incomplete crowding gets penalty 1.25, never zero. Comfort modes cap duration at the smaller of fastest+30 minutes and 1.5 times fastest. Displayed journey demand is a segment-duration-weighted index, not a passenger count.

The frontend displays route/stop details, incomplete coverage and later-departure comparisons. An evidence-searched illustration for 24 November at 20:00 compares a 19-minute 717ADOWN fastest journey (index 99) with a 23-minute 544UP less-crowded journey (index 84), each with complete coverage and Moderate evidence. The index difference is 15 percentile points, not a measured passenger reduction. The example was selected from 1,200 direct weekday candidate queries and is not a representative impact estimate; route uptake and supply differ. The named Anand Vihar-Connaught Place brief example currently has no matched crowd evidence. Map geometry connects consecutive stops with straight lines rather than street-following shapes. Later-departure alternatives may change route as well as service.

## Testing, performance and reproducibility

Run commands and dependency locks are in README.md. Backend tests cover input types, NULL/duplicates, GTFS integrity, directions, calendar exceptions, after-midnight service, segment expansion, schedules, fallback, scores, direct routes, transfers and API error states. React tests cover loading, unavailable data, failure/retry and keyboard stop search. Synthetic fixtures are isolated to tests and never served by the real app.

The full CSV ingestion took about 24 seconds on this workstation. HTTP measurements are saved separately in data/reports/http-verification.json; they are localhost checks, not concurrency benchmarks. API models load once, expensive journey queries have a bounded cache, and the frontend has separate chart/map bundles.

Executed checks: 45 backend tests, 8 default frontend tests, one opt-in React test with real HTTP data, and three real journey HTTP scenarios. Recent HTTP smoke requests took 2.3-4.7 seconds, including four departure comparisons. These are local smoke timings, not load benchmarks.

The native desktop-control pipe was unavailable, but installed Chrome supported headless browser tests and recording. Actual autocomplete, map-path clicks, segment inspection, route/date changes and evidence screens pass at 1440x1000 and 390x844, with zero page errors or request failures in the final check. Screenshots were inspected. Browser review caught API-key-required CARTO tiles and an obscured route line; switching to standard OpenStreetMap tiles and separating map/details resolved both. Charts now render without transitional animation. The recording uses actual UI data with explicit DEMO GUIDE annotations; it is silent. This is viewport emulation, not physical-device testing. See docs/qa-report.md for final executed counts.

## Remaining limitations and next evidence

Review the actual browser recording and final submission as the team. Review unmatched OD diagnostics before cautiously extending alias coverage; never auto-accept ambiguous paths. Obtain ETM/APC, capacity and timing evidence before physical load or per-service calibration. Add an untouched future test period and independent travel-time checks. No exact seats, live demand, holiday awareness, calibrated confidence, measured user impact or deployment is claimed.

Sources: https://delhi.transportstack.in/hackathon/ ; https://gtfs.org/documentation/schedule/reference/ ; https://pub-091bd9e794bb4877b10b29e6df80f065.r2.dev/2026-10/README.md . Research decisions and linked original papers are in docs/research/technical-research.md.
