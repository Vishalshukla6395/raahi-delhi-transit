# RAAHI
## Delhi Comfort Intelligence

Transport Stack Hackathon 2026 | Problem 2 | Phase 1

**Team Turing**

- Vishal Shukla - Team Lead
- Sujit Verma - Team Member
- Saurabh Kumar - Team Member

Source: https://github.com/Vishalshukla6395/raahi-delhi-transit

**Readiness disclosure:** the real ticket pipeline, authorised full GTFS, route and segment models and Delhi journey search run locally. HTTP and React-to-API integration checks pass using actual records. Headless Chrome interaction checks pass at desktop and mobile viewport sizes; an actual application recording accompanies the package. No hosted application deployment exists. Public map tiles depend on external availability.

## The commuter problem

A fastest journey can still be an uncomfortable journey. A commuter needs to weigh travel time against expected demand and understand when the evidence is thin. RAAHI aims to make that trade-off visible for Delhi bus travel without inventing seat availability or precise occupancy.

Our target user is a bus commuter with some flexibility in route or departure time. A transparent historical view may also help transport researchers examine sampled demand, but this phase does not build an operator management system.

## The proposed experience

Choose real GTFS stops and a departure time. Compare fastest, balanced and less-crowded scheduled alternatives. Inspect demand along individual route segments, then compare departures 15, 30 or 60 minutes later. Each result carries an explanation, coverage and evidence grade. Unknown demand remains unknown.

The available October file is a digital ONDC e-ticket sample. RAAHI estimates its observed transaction demand by time and matched segment; it does not infer physical onboard occupancy, seats available or the full ETM/cash/passenger population.

The current interface already includes the planner workspace, real route-demand explorer and model-evidence screen. The full network is loaded; journeys expose measured historical evidence where supported and unavailable labels elsewhere.

## Contribution and differentiation

Crowding information is not unique to RAAHI: Google Maps and Moovit document existing approaches. Our contribution is a reproducible, inspectable use of Delhi ticket origins and destinations, combined with segment-order validation and evidence-aware recommendations. The goal is a component that Transport Stack can inspect and extend, not a replacement ticketing or live-tracking application.

The implemented segment model allocates passenger_count to every traversed link, not just the boarding stop. Relative-demand outputs explicitly separate sampled transactions from actual onboard occupancy. A commuter can inspect what supports a recommendation instead of receiving an unexplained score.

## Data and engineering method

The official October archive contains 2,559,899 ticket records representing 2,753,606 sampled passengers across 31 dates and 2,259 route labels. Its published checksum was verified. Missing vehicle identifiers affect 1,242,167 rows, so we do not assume complete vehicle-trip assignment.

The pipeline validates timestamps and counts, profiles missingness and duplicates, and stores private diagnostics outside Git. The full GTFS contains 6,862 stops, 2,574 routes and 80,357 trips. Exact-normalised, direction-aware matching accepts 819,490 records (32.01%); ambiguous and unmatched paths are excluded and reported. The model covers the top 100 of 1,865 matched patterns, 388,083 records and 4,769 segments. This is 15.2% of all archive records and 2.86% of the 3,498 GTFS patterns.

The segment model uses the mean for each 30-minute time slot across available October dates. This simpler predictor was selected after two fixed-window departure-order checks slightly favored same-slot over a weekday/weekend seasonal profile; held-out WAPE slightly favored the seasonal comparison. It predicts sampled ticket demand, not physical passenger occupancy.

## Feasibility and scope

React/TypeScript, Leaflet and Recharts provide the interface. Python, DuckDB and Parquet handle analytics; FastAPI serves versioned queries. The project runs locally without a database server. Source includes deterministic correctness tests and reproducible processing commands.

The supplied full feed passes reference and sequence checks. On 24-31 October, the production same-slot predictor has MAE 0.6218, WAPE 69.96% and rank correlation 0.6891; the seasonal comparison has WAPE 69.43%. In the retrospective 15-21 October check, same-slot WAPE is 82.37% vs 83.10% seasonal. The evidence is mixed and small; it does not establish physical crowding accuracy. Pattern selection uses full-month volume, so these are conditional scope results. They validate sampled ticket demand, not bus occupancy. The disconnected public sample was rejected and never used for real routing.

## Expected impact and evaluation

The intended value is more informed route/time choice, with explicit uncertainty. No user study or measured crowd reduction has been conducted. One fully covered illustrative query from Hamdard Nagar / Sangam Vihar to Badarpur M B Road at 20:00 returns a 19-minute 717ADOWN journey at index 99 and a 23-minute 544UP journey at index 84; both have Moderate evidence. The interface explains four extra scheduled minutes and 15 lower demand-index points, not a percentage reduction in passengers. Route-specific ticket adoption and bus frequency can confound the difference. Physical load and travel-time accuracy require independent evidence.

## Responsible extension

After Phase 1, obtain ETM or passenger-count evidence, validate service timing and capacity, calibrate route-specific sampling bias, and test on a separate future week. Broader routes and stronger models follow measured benefit. Accounts, booking, payments, metro and feeder optimisation are outside this phase.

## Sources and credit

Official brief: https://delhi.transportstack.in/hackathon/

Data documentation: https://pub-091bd9e794bb4877b10b29e6df80f065.r2.dev/2026-10/README.md

Data attribution: Delhi Transport Stack / CSM, IIIT Delhi; ONDC e-ticket records. Libraries and OpenAI Codex assistance are acknowledged in ATTRIBUTION.md. The team must review the implementation and evidence before submission.
