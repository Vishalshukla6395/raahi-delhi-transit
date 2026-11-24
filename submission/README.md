> Publication confirmed: source, proposal, technical note, MP4 demo and six key screenshots are published on the repository main branch. The original WebM and extended screenshot history are included only in the complete local ZIP; links to those extended screenshots in historical design reports are local-archive references. No hosted app or hackathon portal submission is claimed.

> Final preparation update (24 November, late evening IST): Team Turing details are supplied. Source destination: https://github.com/Vishalshukla6395/raahi-delhi-transit. See [submission handoff](submit-now.md) for current upload files and status. Earlier no-remote/team-missing notes below describe the prior audit snapshot. No portal submission has been performed. Refreshed browser interactions pass; external map tiles had cancellations/incomplete loading, so earlier zero-failed-request claims do not describe this latest run.

# Phase 1 submission package

**Local Phase 1 prototype and independent readiness audit are complete.** The same-slot model directly represents 15.2% of ticket archive records on 100 GTFS patterns; true passenger occupancy is unvalidated. Final published source/video URLs, actual team details and hackathon submission remain outstanding.

| File | Purpose |
|---|---|
| `proposal.md` | Editable proposal with current implementation boundaries |
| `proposal.pdf` | Formatted proposal; includes readiness disclosure |
| `technical-note.md` | Editable methodology and measured evidence |
| `technical-note.pdf` | Formatted technical note |
| `demo-script.md` | Honest current-build walkthrough and conditional full-journey sequence |
| `demo.mp4` | Submission-friendly actual app recording with DEMO GUIDE annotations; silent |
| `demo.webm` | Original browser capture |
| `checklist.md` | PASS/PARTIAL/BLOCKED for every acceptance criterion |
| `../docs/final-hackathon-audit.md` | Critical official-requirements, judging, model and shippability review |
| `README.md` | This package index |

Supporting files: root `README.md`, `BUILD_STATUS.md`, `ATTRIBUTION.md`, `LICENSE`, `docs/architecture.md`, research notes, data/model reports and `docs/qa-report.md`.

The actual browser demo is included as `demo.mp4` and `demo.webm`; it is a silent screen recording with explanatory annotations. Desktop/mobile viewport screenshots and browser verification are included in docs/screenshots and data/reports. Physical mobile-device testing was not performed. The public source URL, registration, submission and deployment remain absent.

PDFs can be regenerated with `python scripts/build_submission.py` using ReportLab. Team identity and repository/demo links should be added only when actual values exist.

To reproduce the MP4 after browser capture, install the optional recording helper (`python -m pip install imageio-ffmpeg==0.8.1`) and run `python scripts/convert_demo.py`. This helper is not required to run RAAHI.
