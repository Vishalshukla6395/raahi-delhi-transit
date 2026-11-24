# Team Turing - submission handoff

Project: RAAHI - Delhi Comfort Intelligence

Track: Transport Stack Hackathon 2026, Phase 1, Problem 2

Team: Vishal Shukla (Team Lead), Sujit Verma, Saurabh Kumar.

Source repository: https://github.com/Vishalshukla6395/raahi-delhi-transit

Demo link: https://github.com/Vishalshukla6395/raahi-delhi-transit/blob/main/submission/demo.mp4

## Upload files

- Proposal: `submission/proposal.pdf`
- Technical note: `submission/technical-note.pdf`
- Short actual-app demo: `submission/demo.mp4` (silent, annotated)
- Complete source and evidence archive: `submission/release/RAAHI-prototype-submission.zip`

## Paste-ready description

RAAHI helps Delhi bus commuters compare scheduled journey time with historical sampled ticket demand. It processes 2,559,899 October e-ticket records and the authorised full GTFS, supports direct and single-transfer journeys, and displays segment evidence, missing-data states and later departures in English and Hindi. One supported example offers four extra scheduled minutes for a 15-point lower demand index. The model covers 100 patterns and 15.2% of archive records. Demand indices are historical sample percentiles, not onboard occupancy, seat guarantees or measured comfort improvements. Source, reproducible setup, model validation, technical note and actual application recording are included.

## Final verification, 24 November 2026

45 backend tests and 11 frontend tests including live API integration pass. Production build, real HTTP profile and three journey searches pass. Refreshed desktop/mobile Chrome interaction checks pass with no JavaScript errors. External map tile requests include cancellations and incomplete loading; tile availability is not guaranteed. Current demo was recaptured after updating the recorder for expandable comparisons.

## Submission status

Source, PDFs and MP4 are published on the repository main branch. The local master branch preserves full development history; submission-publish tracks the compact public snapshot. The original WebM and extended screenshots remain in the local ZIP.

The official listing states 24 November 2026, 6:29 PM IST as the Phase 1 deadline, already past at this preparation time, while still displaying Live. Acceptance or an extension must be checked in the registered team's portal. No portal submission or receipt is claimed here.

Portal: https://whereuelevate.com/drills/transport-stack-hackathon-2026
