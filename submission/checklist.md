> Final preparation update (24 November, late evening IST): Team Turing details are supplied. Source destination: https://github.com/Vishalshukla6395/raahi-delhi-transit. See [submission handoff](submit-now.md) for current upload files and status. Earlier no-remote/team-missing notes below describe the prior audit snapshot. No portal submission has been performed. Refreshed browser interactions pass; external map tiles had cancellations/incomplete loading, so earlier zero-failed-request claims do not describe this latest run.

# Phase 1 acceptance checklist

24 November 2026. PASS means evidence exists within the stated boundary; it does not imply physical crowding accuracy or production readiness.

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | Runs locally from documented commands | PASS | Uvicorn serves production UI and versioned API; build and HTTP checks executed |
| 2 | Actual October dataset ingested | PASS | 2,559,899 records; published checksum; data-quality report |
| 3 | Official GTFS processed | PASS | Full authorised archive; 2,737,136 stop times and zero reference errors |
| 4 | Matching and quality reports exist | PASS | network-quality.json, data-quality.json and private unmatched diagnostics |
| 5 | Segment demand calculations work | PASS | Independent reconciliation of 5,915,129 traversals across 4,769 segment keys; pipeline integration test |
| 6 | Historical crowd predictions work | PARTIAL | Sampled e-ticket-demand profiles exist for 100 patterns; no ETM/APC or physical occupancy labels |
| 7 | Model validation actually run | PASS | Route and segment chronological metrics, baseline comparison and split disclosure |
| 8 | Origin/destination search works | PASS | Real stop HTTP checks; autocomplete tests; real UI/API pair selection |
| 9 | Real route alternatives returned | PASS | Three real HTTP scenarios return 3-5 alternatives |
| 10 | Crowd information alongside journeys | PARTIAL | Complete-coverage sampled-demand indices and a time comparison are shown; physical crowdedness and cross-route sample calibration remain unverified |
| 11 | Individual segments inspectable | PASS | Actual React/API segment-button interaction; actual browser map-path click also verified |
| 12 | Evidence strength explained | PASS | Actual evidence panel and inspected segment; explicit heuristic thresholds |
| 13 | UI handles unavailable predictions | PASS | Isolated tests and real alternative without model coverage |
| 14 | Central journey works end to end | PASS | Actual Chrome desktop and mobile viewport flows, screenshots, map clicks and real-data integration; no physical-device claim |
| 15 | No misleading mocked data displayed | PASS | Production API uses only processed artifacts; synthetic fixtures isolated in tests |
| 16 | README complete | PASS | Setup, preprocessing, actual example, API, tests, limitations and attribution |
| 17 | Technical note complete | PASS | Editable source and regenerated PDF with actual matching/segment metrics |
| 18 | Proposal complete | PASS | Editable source and regenerated PDF; remaining submission work disclosed |
| 19 | Demo script ready | PASS | Approximately two-minute walkthrough with a verified real OD/time and honest evidence; exact capture timing in data/reports/demo-recording.json |
| 20 | Submission checklist complete | PASS | This per-criterion audit with explicit validation boundaries |

## Required before submitting

- **Complete:** headless Chrome desktop/mobile viewport review and actual app recording. The native desktop pipe was unavailable, but Chrome testing and capture succeeded.
- **Complete:** Team Turing: Vishal Shukla (lead), Sujit Verma and Saurabh Kumar, supplied by the team on 24 November.
- **Outstanding:** verify the owner-qualified URL and publish current source to `raahi-delhi-transit`. A repository name alone is not a working source URL. No code has been pushed by this preparation run.
- Review proposal/technical note and source attribution as the participating team.
- Upload the actual proposal, code URL and demo through the hackathon workflow. No registration/submission action has been performed.

The software and package checks pass locally where indicated. The central Problem 2 crowding deliverable remains partial because the accessible data do not establish onboard load. External submission remains outstanding until the team supplies details, reviews the package and publishes a working source URL. Local PASS is not equivalent to full Problem 2 scientific validation.
