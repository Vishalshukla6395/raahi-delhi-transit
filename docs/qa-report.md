> Final preparation update (24 November, late evening IST): Team Turing details are supplied. Source destination: https://github.com/Vishalshukla6395/raahi-delhi-transit. See [submission handoff](../submission/submit-now.md) for current upload files and status. Earlier no-remote/team-missing notes below describe the prior audit snapshot. No portal submission has been performed. Refreshed browser interactions pass; external map tiles had cancellations/incomplete loading, so earlier zero-failed-request claims do not describe this latest run.

# QA report - 24 November 2026

All work is local. No source repository was published, no deployment created, and no hackathon submission sent.

## Executed checks

| Check | Result | Boundary |
|---|---|---|
| Clean Python install | Passed | New ignored `tmp/clean-venv`; pinned `requirements-lock.txt`, editable project install, and all 45 tests passed; one upstream Starlette/httpx deprecation warning |
| Clean frontend install | Passed | `npm ci`, 8 tests passed/1 skipped, production build passed, zero production vulnerabilities; npm reported the environment's blocked esbuild install-script policy, while the built app and tests still ran successfully |
| Backend pytest | 45 passed | Pipeline, matching, model, route planning, comparisons, and API behavior; one upstream Starlette/httpx deprecation warning |
| Frontend Vitest | 10 passed | Current isolated UI tests; the opt-in live integration also passed, for 11 tests total |
| Live React/API integration | 1 passed | Actual API data in the rendered app, coverage-supported journey pair, segment evidence and model evidence; jsdom omits map/chart drawing |
| TypeScript and Vite production build | Passed | Production compilation and bundling |
| npm audit | Zero production vulnerabilities | Dependency advisory snapshot, not a full security audit |
| Full static GTFS integrity | Passed | 6,862 stops, 2,574 routes, 80,357 trips and 2,737,136 stop times; no broken references or rejected trips |
| Ticket-to-segment reconciliation | Passed | Independent audit reproduces 5,915,129 traversals from 388,083 matched records across the selected 100 patterns |
| HTTP health/profile | Passed | API reports ready; real route profile and input validation checks passed; 10 localhost requests are not a load benchmark |
| Journey HTTP smoke | Passed | Fastest, balanced and less-crowded actual searches; five alternatives, route segments and delayed departures |
| Browser QA | Passed | Installed headless Chrome at 1440x1000 and 390x844; real autocomplete, journeys, map/segment interactions, evidence, demo trade-off, no errors or failed requests; 15/15 tiles loaded |
| Demo recording | Approximately 118 seconds; MP4 fully decoded | Current refined interface captured from the actual local app with explanatory DEMO GUIDE annotations; silent |

## Model validation boundary

The latest focused UI refinement adds a bilingual, seven-viewport browser matrix at `data/reports/phase1-refinement-qa.json`, plus six responsive follow-up cases at `data/reports/phase1-refinement-mobile-qa.json`; all passed. Current screenshots are in `docs/screenshots/refinement/`. See `docs/design/phase1-refinement.md` for the screen-by-screen changes and verification scope. The silent demo has been recaptured and its MP4 fully decoded. Earlier screenshots outside the refinement folder are historical. The proposal, technical note, data, model and backend results are unchanged.

The segment predictor has 4,769 keys and 2,793,293 daily feature rows. Production uses the simpler same-time-slot mean. On the 24-31 October holdout it has WAPE 69.96%; the seasonal comparison has 69.43%. In the retrospective 1-14 / 15-21 October check, same-slot WAPE is 82.37% versus seasonal 83.10%. Within-pattern departure-order agreement is 62.06% vs 61.82% in that week and 64.11% vs 63.83% in the final week, respectively. The tiny differences favoring each model vary by metric; all pairs and rows are correlated. These conditional diagnostics do not validate occupancy, comfort or future performance. Details are in `data/reports/model-audit.json` and `docs/model/segment-validation.md`.

## Journey and UI checks

The supported demo preset is selected from real routes and demand profiles. The refreshed recording uses the current local model. Both compared routes have complete modeled segment coverage and Moderate evidence. It shows a 19-minute scheduled route at index 99 and a 23-minute route at index 84: four additional scheduled minutes for a 15-point lower historical demand index. The point difference is not a percentage or a passenger-load estimate, and the chosen cross-route example is not representative of all riders. Exact values and provenance are in `data/reports/tradeoff-examples.json` and the API's `/api/v1/demo` endpoint.

Anand Vihar to Connaught Place is also checked in the actual browser. The timetable planner can return scheduled alternatives, but these have no matched crowd history; the interface leaves demand unavailable instead of presenting missing data as low crowding. Stop autocomplete surfaces duplicate locality names with distinct IDs, so locality disambiguation remains a usability issue.

## Reproduction and evidence

- `data/reports/browser-verification.json`, screenshots in `docs/screenshots/`
- `data/reports/http-verification.json`, `data/reports/journey-verification.json`
- `data/reports/gtfs-provenance.json`, `data/reports/network-quality.json`
- `data/reports/segment-reconciliation.json`, `data/reports/model-audit.json`
- `scripts/audit_pattern_coverage.py`, `audit_network.py`, `audit_model.py`, `find_tradeoffs.py`
- `scripts/verify_live.py`, `verify_journeys.py`; `frontend/src/App.live.test.tsx` (rerun against the restarted local API after clean installs)

## Still unverified

No ETM/APC or physical passenger-count target was available in this archive. The output is sampled digital ticket demand joined to scheduled GTFS, not estimated people aboard, seat availability, or calibrated physical crowding. Also unverified: physical handset behavior, field accuracy of scheduled travel minutes, rider impact, concurrency capacity, and public deployment. External map-tile availability is required. See `submission/checklist.md` and `docs/final-hackathon-audit.md`.
