> Final preparation update (24 November, late evening IST): Team Turing details are supplied. Source destination: https://github.com/Vishalshukla6395/raahi-delhi-transit. See [submission handoff](submission/submit-now.md) for current upload files and status. Earlier no-remote/team-missing notes below describe the prior audit snapshot. No portal submission has been performed. Refreshed browser interactions pass; external map tiles had cancellations/incomplete loading, so earlier zero-failed-request claims do not describe this latest run.

# RAAHI build status

Updated 24 November 2026. Local workspace only; no repository push, deployment, registration or hackathon submission was performed.

## Delivery

| Area | Status |
|---|---|
| Official October ONDC e-ticket archive | Complete; SHA-256 verified; 2,559,899 records |
| User-downloaded full Delhi GTFS | Complete; 6,862 stops, 2,574 routes, 80,357 trips; zero broken references |
| Strict GTFS matching and sampled segment demand | Complete within an explicit top-100 matched-pattern scope |
| Historical route and segment model | Complete, evaluated; scientific crowding validity remains limited |
| Journey planner and interface | Running locally with real schedules, evidence, confidence scope and time/demand comparisons |
| Final audit, proposal, technical note and demo | Updated with the audit findings; code and video URLs still need publishing |

## Actual coverage

- 819,490 tickets (32.01%) match exactly one forward route/stop path. 1,228,307 have unmatched stops/directions, 471,150 are ambiguous and 40,952 have unknown routes.
- 100 of 1,865 uniquely matched patterns are modeled: 388,083 tickets, 4,769 segment keys, 2,793,293 daily feature rows and 5,915,129 passenger-segment traversals independently reconciled.
- This is 47.36% of matched ticket records, 15.16% of the entire e-ticket archive and 2.86% of the 3,498 GTFS patterns. It is not population coverage.
- Full-month segment validation (train 1-23, validate 24-31 October): production same-slot MAE 0.6218, WAPE 69.96%, rank 0.6891. Seasonal comparison: MAE 0.6171, WAPE 69.43%, rank 0.6889. Constant baseline WAPE 118.65%.
- Fixed-window same-slot/seasonal WAPE is 82.37%/83.10% for 15-21 Oct and 69.96%/69.43% for 24-31 Oct. Same-slot departure-order agreement is marginally higher in both checks (62.06%/61.82% and 64.11%/63.83%). The small, conflicting differences support using the simpler same-slot method, not claiming superiority.
- 1,200 deterministic direct weekday candidates produced one complete-coverage, Moderate-evidence illustration: Hamdard Nagar / Sangam Vihar to Badarpur M B Road at 20:00, 717ADOWN (19 min, index 99) vs 544UP (23 min, index 84). This is an example, not an impact estimate.

## Function and validation

Search uses the full GTFS network, direct and one same-stop transfer, and strict pickup/dropoff/calendar rules. Uncovered crowd data stays unavailable. The interface explains partial-evidence coverage, shows actual route/stop details, and compares time with demand-index points. Index differences are not percent passenger reductions.

Automated checks and actual browser verification are recorded in [the QA report](docs/qa-report.md) and [final audit](docs/final-hackathon-audit.md). Reproduction commands and resource needs are in [README](README.md).

## Main remaining risks

The available archive is ONDC e-ticket data; no ETM/APC or physical passenger counts are included. Nearly half the archive lacks vehicle IDs. Exact matching leaves substantial unmatched and ambiguous data. Cross-route ticket uptake and service supply are uncalibrated. Error remains high, and the segment model is a same-slot baseline; the seasonal comparison has slightly lower held-out WAPE. Timetable accuracy and physical crowd reduction are unverified. The named Anand Vihar-Connaught Place example has no demand match. Maps connect stops with straight lines.

The project is locally reproducible when the reviewer obtains the authorised GTFS. Raw records and licensed feed remain ignored rather than placed in a public source archive. Before external evaluation, the team must review the package, supply real team details and publish a source URL. No public repository or deployment exists yet; no external action was performed.
