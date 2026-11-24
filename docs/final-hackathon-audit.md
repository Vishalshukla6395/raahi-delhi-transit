> Final preparation update (24 November, late evening IST): Team Turing details are supplied. Source destination: https://github.com/Vishalshukla6395/raahi-delhi-transit. See [submission handoff](../submission/submit-now.md) for current upload files and status. Earlier no-remote/team-missing notes below describe the prior audit snapshot. No portal submission has been performed. Refreshed browser interactions pass; external map tiles had cancellations/incomplete loading, so earlier zero-failed-request claims do not describe this latest run.

# RAAHI: final hackathon readiness audit

**Audit date:** 24 November 2026. **Phase 1 deadline:** 24 November, 6:29 PM IST, per the [official listing](https://whereuelevate.com/drills/transport-stack-hackathon-2026). **Scope:** Problem 2, Phase 1, local implementation and artifacts in this workspace. The official brief describes a bus-only journey planner, ticket-derived crowdedness estimates by route, stretch and time of day, an understandable commuter display and a faster-versus-comfort choice. It names e-ticket and ETM data. See the [official hackathon problem page](https://delhi.transportstack.in/hackathon/) and [full Problem 2 brief](https://docs.google.com/document/d/1ocS9rG4_E_Fb9DJcqTG8SClrLJJ_UJqGGAhgPbV8tr4/preview).

## Executive assessment

**Verdict: CONDITIONALLY READY.** RAAHI is a working local prototype, grounded in real October digital ticket records and an authorized full static bus GTFS. It integrates exact route and stop matching, segment aggregation, historical profiles, a scheduled journey search and an inspectable UI. The expanded model directly covers 100 matched patterns and a verified example shows an explicit time/index trade-off.

The central scientific claim is much narrower than “we know how crowded the bus is.” The available archive documents ONDC e-tickets. It does not provide the trip assignment, vehicle capacity, complete ETM coverage or APC counts needed to infer physical passenger load. Nearly half of the records lack a vehicle number. Transactions are attached to all segments between named origin and destination at the transaction timestamp, not to a verified bus trip or each segment's actual traversal time. The output is consequently a model of **sampled ticket demand**, not onboard occupancy.

Coverage is a second major limit: 100 patterns comprise 2.86% of the full feed's 3,498 patterns and 15.16% of archive records. The model has substantial absolute error. Seasonal history has slightly lower WAPE in the last eight dates; the simpler production same-slot predictor has marginally better sampled-demand ordering in both post-hoc windows. These close, mixed results are not proof of crowd prediction. The named Anand Vihar to Connaught Place brief example currently returns schedule options without usable crowd evidence. These facts should be visible during judging.

RAAHI is credible as an honest, technically substantial research prototype. It is a **conditional** contender for shortlisting, not a validated crowding product and not an obvious winner. A reviewer can reproduce it locally only after obtaining the authorized GTFS; judges cannot visit this machine or a published deployment. The working source URL required by the submission workflow is still outstanding.

## Final engineering sprint findings and changes

- Refit and compared same-slot and seasonal segment estimates on the same chronological windows. The production planner now uses the simpler all-days same-time-slot mean; the seasonal profile remains a measured comparison. This reduces unjustified model complexity while accurately disclosing that the WAPE winner and ordering winner differ.
- Expanded the retrospective decision check to score both methods on within-pattern +30/+60-minute ordering. Same-slot was 62.06% versus 61.82% seasonal in 15-21 October, and 64.11% versus 63.83% in 24-31 October. These are correlated pair rows and support only a cautious method choice.
- Closed a reproducibility mismatch: the network pipeline function default is now 100 patterns, matching the documented/CLI build instead of silently reverting to 30.
- Corrected the model card's stale initial top-30 wording and made the production method, validation trade-offs and top-150 coverage estimate consistent across code, report and proposal.
- Audited a possible top-150 expansion. It adds an estimated 3.02 percentage points (about 77,246 records) of archive coverage, but was not fitted or validated and the existing 100-pattern build used about 3 GB resident memory. The broader run would have been a risky, unvalidated change under the deadline, so model coverage remains at 100 patterns.
- Removed the duplicate comparison card from the options sidebar; the journey-detail pane remains the single comparison location. Updated the evidence screen to distinguish production same-slot metrics from seasonal comparisons.
- Reran API-backed integration, browser QA and the demo. The current real-data preset still shows 19 minutes/index 99 versus 23 minutes/index 84 with complete modeled coverage and Moderate heuristic evidence; the point gap is 15, not 16.
- Prepared a clean local Git root commit (`2664a6b`). Raw tickets, licensed GTFS, processed model files, `.env`, `.venv` and `node_modules` are ignored or absent from the commit. There is no Git remote; nothing was published, deployed or submitted.

## Official requirements and actual implementation

| Problem 2 requirement | Finding | Status |
|---|---|---|
| Use about 4-5 weeks of e-ticket and ETM data | The October archive has 31 days and 2,559,899 ONDC e-ticket records. No separate ETM data was obtained. The source describes an e-ticket dataset, not a linked bus census. | Partial |
| Estimate how many passengers are aboard by route, direction, segment and time | Route totals and 100 GTFS segment histories are computed from sampled OD records. No per-service assignment or vehicle load is reconstructed; one transaction timestamp is reused across the OD path. | Partial; target is a proxy |
| Translate estimated load to a simple crowd level | The app shows relative sampled-demand percentiles and evidence grades. “Lower/higher demand” avoids implying seats or capacity, but it does not fulfil the brief's occupancy-based levels. | Partial |
| Show demand alongside alternative journey times | The planner shows GTFS schedule estimates, relative demand, evidence coverage and unavailable states. | Implemented within modeled scope |
| Offer faster versus more comfortable choices | Fastest, Balanced and Less Crowded modes; bounded detours; later-departure comparisons; the new comparison card states minutes and index-point differences. | Implemented; comfort benefit unvalidated |
| Bus-only planner using static GTFS | Full authorized bus feed loaded; direct and one same-stop transfer with calendar, exception, pickup and dropoff handling. Static schedules are not observed arrival times. | Implemented within stated search limits |
| Rerunnable pipeline and mapped output | Source scripts rebuild ticket profiles and segment artifacts; raw tickets and licensed GTFS are ignored by Git. A reviewer needs their own authorized feed. | Conditional on data access |
| Check peaks and weekday/weekend patterns | Daily/weekday summaries and time profiles are inspected; a second chronological window compares against a stronger baseline. These are internal plausibility checks, not independent occupancy observations. | Partial |
| Technical note, source/README and short demo | Editable and rendered proposal/note, code, walkthrough, browser evidence and silent annotated recording exist locally. | Present locally |
| Working source URL for judges | No remote repository URL has been created or published. | Outstanding |

## Model and data verification

The public October ZIP checksum matches the publisher's SHA-256. All 2,559,899 records pass the parser's structural rules; this does not establish complete real-world ticket capture. The rows represent 2,753,606 sampled passengers. Vehicle IDs are absent on 1,242,167 rows. We have no ticket-to-trip join or bus capacity data.

The authorized GTFS has 6,862 stops, 2,574 bus routes, 80,357 trips, 2,737,136 stop-time rows and 3,498 stop-sequence patterns, with zero broken stop/trip references and zero rejected trips. GTFS coordinates and timetables establish network connectivity and schedules, not that a trip ran or followed that time.

Exact normalized route and stop names with a unique forward path match 819,490 records (32.01%). 1,228,307 have unmatched stops or direction, 471,150 have ambiguous paths and 40,952 have unknown route labels. Fuzzy paths remain excluded. The top 100 uniquely matched patterns account for 388,083 records: 47.36% of matched records, 15.16% of the complete digital archive and 2.86% of all GTFS patterns. Their 4,769 segment keys reconcile independently to 5,915,129 passenger-segment traversals. This verifies the expansion arithmetic, not geographic stop matching in the field or physical loads.

A coverage audit estimates the top 150 patterns would include 18.18% of archive records, only 3.02 percentage points (about 77,246 records) above the current scope. That larger fit was not built or validated. The 100-pattern pipeline already peaked near 3 GB resident memory; expanding scope close to the deadline would add runtime and memory risk without evidence that the extra patterns produce reliable predictions. I kept the validated top-100 scope and expose the rest as unavailable.

### Validation that puts the headline metrics in context

The principal segment evaluation trains on 1-23 October and validates on 24-31 October; zeros are included as no **observed sample** tickets. On 1,831,296 cells, the production same-slot model has MAE 0.6218 sampled traversals per bin, WAPE 69.96% and rank correlation 0.6891. The seasonal comparison has MAE 0.6171, WAPE 69.43% and rank correlation 0.6889. A constant all-bin mean has WAPE 118.65%. WAPE can exceed 100% because total absolute error can exceed the sum of observed targets; zero-heavy sparse cells and a baseline that ignores rush-hour structure make this baseline easy to beat.

The seasonal comparison has 69.43% WAPE on 24-31 October versus 69.96% for the production same-slot predictor. In the retrospective 1-14 / 15-21 October window, same-slot WAPE is 82.37% versus 83.10% seasonal; in the final week it is 69.96% versus 69.43%. Same-slot departure-order agreement is 62.06% and 64.11%, versus 61.82% and 63.83% seasonal. These small, mixed results support a simpler production method, not an accuracy claim.

Within-pattern comparisons for +30/+60 minute sampled-demand values agree with observed ordering 62.06%/61.82% (same-slot/seasonal, 15-21 October) and 64.11%/63.83% (24-31 October), after excluding actual ties and granting half credit to predicted ties. These are over one million correlated segment/day pairs, not independent observations or evidence of improved comfort. Neither fold is a preregistered prospective trial. The production corridors were selected by full-month volume and the 30-minute window was selected using the original validation period. Treat all scores as conditional diagnostics, not unbiased network-wide performance.

The same October ticket archive has commute-like observed peaks at 08:00-09:00 and 18:00-19:00. This is a useful internal consistency check, not independent “known occupancy” validation. Sampling rates, pass holders, cash/ETM riders, fares and service frequency differ by route. Relative cross-route indices therefore cannot be read as relative full-bus loads.

## Actual browser review

The native Windows Computer Use connection was unavailable. I used installed Chrome through Playwright against the running production UI, clicked and typed through actual controls, captured screenshots and inspected them. This is real browser rendering and interaction, but automated/headless, not a physical device or commuter study.

| Scenario | Observed result |
|---|---|
| Empty origin/destination search | Clear validation alert asks for both stops to be selected from suggestions; no API journey request is fabricated. |
| Stop autocomplete: “Anand Vihar” | Multiple real similarly named stops appear, including two exact “Anand Vihar” results with different stop IDs. IDs are exposed, but users still need better locality context. |
| Named Anand Vihar to Connaught Place example | A schedule itinerary is returned; all tested alternatives lack matched crowd estimates. The interface withholds a crowd recommendation rather than treating missing data as quiet. |
| Supported historical pair | An evidence-searched preset is generated only from real modeled patterns with complete coverage and Moderate evidence on both options. The planner recomputes the search; it does not hardcode result cards. |
| Morning, evening and off-peak | Route and time variants were evaluated against actual schedules and demand profiles. The finalized browser report records eight UI scenarios at desktop and mobile viewport sizes; all 15 visible map tiles loaded, with zero page errors or failed requests. |
| Alternative modes and later departures | The interface invalidates stale journeys when controls change, shows coverage and the fastest-reference comparison, and states elapsed time from the original requested departure. A delayed option may be a different route. |
| Map, segment and mobile layout | The final Chrome QA checks route-path click, segment evidence, map tile requests, route/date chart changes, evidence screen, 1440x1000 and 390x844 layouts, and horizontal overflow. It does not validate street-following shape. |
| Errors and requests | Final browser report records page exceptions, failed requests and loaded map tiles; see `data/reports/browser-verification.json`. |

The app uses a clean green transit identity and a real Delhi basemap. Important experience gaps are duplicate-name stop ambiguity, several-second cold journey searches, lack of live/observed travel times, unavailable crowd evidence for many ordinary corridors and reliance on a schedule with an unusually wide calendar date range. A commuter needs a clear “historical sample only” message before trusting a score.

## Innovation and competing approaches

Crowding-aware route choice already exists in products such as Google Maps and Moovit; adding route options and a map is not novel by itself. RAAHI's defensible prototype contribution is the reproducible path from e-ticket origins/destinations through strict ordered GTFS matching and segment expansion, with evidence grades, unavailable states and an explicit bounded time/demand comparison.

One searched illustration (not a representative outcome) is Hamdard Nagar / Sangam Vihar to Badarpur M B Road / Rajiv Gandhi Stadium, 24 November at 20:00: the fastest scheduled 717ADOWN option is 19 minutes at index 99; less-crowded 544UP is 23 minutes at index 84. Both have complete evidence and the Moderate heuristic grade. The card reports four extra minutes and 15 demand-index points. It explicitly says these are not a measured 15% passenger reduction; route uptake and bus supply may drive the difference. The case was found in 1,200 direct weekday candidates, which is a demonstration search and not an unbiased success rate.

That is a concrete decision moment, but it is not strong causal or operational evidence. Cross-route demand percentiles depend on digital-ticket sampling and service supply. A same-route, same-service prediction with ETM/APC ground truth would be much more persuasive.

## Independent panel and internal score

The scores below use the internal rubric specified for this audit; they are not organizer weights. The initial column scores the earlier 30-pattern build before these audit improvements; final scores reflect the broader model, new comparison, stronger baselines, browser findings and revised deliverables.

| Criterion | Initial | Final | What improved / achieved | Remaining judge criticism and best next step |
|---|---:|---:|---|---|
| Problem relevance (15) | 14 | 14 | Directly addresses Delhi bus ticket history and time/demand journey choices. | It estimates digital ticket demand, not how full a bus is. Obtain ETM/APC or passenger counts and service linkage. |
| Innovation (15) | 8 | 9 | Inspectable OD-to-segment pipeline and an honest bounded trade-off on actual routes. | Crowding planners already exist; indices remain sampling-sensitive. Validate route-specific penetration or on-vehicle load. |
| Technical depth (20) | 16 | 17 | Full GTFS validation, strict matching, chronological baselines, independent traversal reconciliation, local API/UI and expanded 100-pattern pipeline. | Sparse proxies, timetable-only minutes, transfers without walking/accessibility, no observed bus operations. |
| Data correctness/model reliability (15) | 7 | 7 | Checksum, data-quality profile, 32% explicit match accounting, unknown states, hard baseline and week-to-week diagnostic. | 69.96% production WAPE remains high; seasonal history scores marginally lower on holdout; no occupancy target. |
| Practical impact/feasibility (15) | 7 | 8 | A commuter-facing example gives a legible schedule trade-off and a feasible locally reproducible stack. | Ordinary journeys may have no model; no user study or measured crowd reduction. Add complete ETM coverage and commuter feedback. |
| Product experience/usability (10) | 8 | 9 | Strong visual identity, map and inspectable routes/segments; explicit coverage and comparison now appear in the flow. | Duplicate stop names, external map dependence, no live service condition; test with real Delhi riders and location context. |
| Documentation/demo (10) | 8 | 9 | Source, README, technical note, proposal, browser screenshots, tests and audit disclose limits; demo now leads with a real trade-off and harder baseline. | Silent local recording and unpublished source URL; team must review and publish a judge-accessible repository. |
| **Total / 100** | **68** | **73** |  |  |

### Strongest five aspects

1. Full real e-ticket file and full GTFS, with checksum and source provenance.
2. Strict, explainable route/path matching; ambiguous records are excluded instead of guessed.
3. Independent OD-to-segment traversal reconciliation across the 100-pattern model.
4. Missing demand stays unavailable, and the UI identifies partial evidence rather than silently ranking it as quiet.
5. A real query visibly trades scheduled minutes for a historical index, with source code, validation and limitations available for inspection.

### Five most serious rejection risks

1. The central deliverable is “crowdedness” but no physical onboard count or load category is established from this e-ticket-only sample.
2. Only 15.16% of archive records and 2.86% of GTFS patterns are directly modeled; the official example has no crowd coverage.
3. Segment WAPE remains about 70%; seasonal history has slightly lower WAPE on the final holdout, and the differences are small.
4. Cross-route index comparisons confound app uptake, fares, pass/ETM riders, bus sizes and trip frequency; the demo's 15 points may not mean less crowding.
5. Judges cannot open localhost. A source URL is required, processed data are private/ignored, and GTFS access must be authorized separately.

## Shippability and remaining work

The repo documents Windows setup, exact dependency locks, data acquisition, pipeline rebuild, app startup, resource needs, tests and attribution. A local production UI/API runs without a database or API key. Raw transactions, vehicle IDs, model intermediates and the authorized GTFS archive are excluded from Git. The browser map needs external tile access. The preprocessing workload peaked near 3 GB resident memory during the expanded build; documentation recommends a larger free-memory margin.

This does not create a judge-accessible product URL. Public source and demo links, team details and hackathon upload remain to be completed by the team. Reproduction on another machine requires an authorized full GTFS request and current ticket archive. Do not put the licensed feed or private raw transactions in a public repository without permission. No publication or submission was performed in this audit.

Highest-impact next evidence: obtain the ETM/APC or manual load sample and bus-service linkage; calibrate ticket penetration and fleet capacity by route/time; assess stop-name ambiguity; run a prospective week on corridors chosen before looking at results; compare estimated load to ground truth; and test the choices with Delhi commuters. These are evidence dependencies, not features that a different model family can solve from the current input.

## Direct answers

1. **What was independently verified?** The 2,559,899-record ticket archive and its checksum; authorized GTFS integrity; exact route/path match counts; segment reconciliation; model diagnostics; a live local API and browser journeys; current screenshots and recording; PDF text and page rendering; dependency and ignored-data boundaries.
2. **What did the previous audit miss?** A callable pipeline default that could rebuild only 30 patterns despite the documented 100-pattern scope; stale top-30 wording in the model card; a decision-order audit that did not compare same-slot against seasonal on both weeks; a duplicated comparison card; and the incremental coverage estimate for top 150. These are now corrected or explicitly recorded.
3. **What was improved?** Production segment forecasts now use same-slot history; both methods are compared on the decision metric; source, UI and submission copy now agree; the demo has the updated 15-point example; the comparison card appears once; the repo has a clean local initial commit.
4. **Is the prediction method more defensible?** Yes, modestly: the planner uses the simpler, interpretable same-slot mean, which marginally led on ordering in both diagnostic windows. Seasonal WAPE is slightly lower in the last holdout, so this is not a claim of better overall accuracy or validated comfort.
5. **Did coverage improve, and why?** No, production coverage stays at 100 patterns, 15.16% of ticket records. Top 150 estimates 18.18%, just +3.02 points, but that fit is unvalidated and adds memory/runtime risk; remaining routes stay visibly unavailable.
6. **What genuinely differentiates RAAHI?** A reproducible path from e-ticket OD records through strict direction-aware GTFS matching and segment expansion, with evidence and missing-data states exposed in a commuter journey comparison. The novelty is this inspectable Delhi-specific pipeline and disclosure, not a new crowding algorithm.
7. **What makes the demo impressive?** It demonstrates a real fully covered choice: four more scheduled minutes for a 15-point lower historical sampled-demand index, with Moderate heuristic evidence, segment inspection and supporting days. This is a vivid conditional example, not a population benefit or passenger reduction.
8. **What can judges still criticize?** No ETM/APC or onboard counts, no service-level ticket assignment, 15.16% archive coverage, high error, route-sampling and frequency confounding, a weak official-example corridor, no commuter study, and no public repo URL yet.
9. **Which files are ready?** `submission/proposal.pdf`, `submission/technical-note.pdf`, `submission/demo.mp4` and `.webm`, editable Markdown, checklist, README, screenshots, QA report, model evidence and the local source commit. The repository has no remote, so the required judge-accessible source URL is not ready.
10. **What must happen before the deadline?** A team member must confirm real team details, publish the clean source to an authorized remote and verify the public URL, then upload the proposal, source link and short demo through the hackathon page before 6:29 PM IST. The official listing requires a working code repo URL, README, short technical note and demo; it does not list a live deployment requirement. No external publication or submission has been done.
