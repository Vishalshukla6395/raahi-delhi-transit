# RAAHI - Delhi Comfort Intelligence

RAAHI is a local Phase 1 prototype for Transport Stack Hackathon 2026, Problem 2. It combines historical ticket-demand analysis with a GTFS journey-planning engine and a React interface.

**Current state:** the complete October ticket archive and authorised full GTFS are processed. Real Delhi journey search and segment-demand inference pass HTTP and React-to-API integration checks. The segment model covers the 100 patterns with the most matched ticket volume: 4,769 segments and 388,083 records (15.2% of the ticket archive). Uncovered journeys show unavailable demand. Headless Chrome checks pass at desktop and mobile viewport sizes; screenshots and actual demo capture accompany the source. Physical-device testing remains unperformed. See [BUILD_STATUS.md](BUILD_STATUS.md), [final audit](docs/final-hackathon-audit.md) and [submission checklist](submission/checklist.md).

## What is implemented

- Reproducible checksum-verified ticket acquisition, DuckDB profiling and Parquet aggregation.
- Chronological route-profile evaluation at 15 and 30 minutes, plus a same-time-slot segment predictor compared against a seasonal weekday/weekend profile.
- Historical route-demand explorer, evidence tables and transparent missing-data states.
- Strict GTFS loader, forward path matching and passenger-weighted segment expansion.
- Direct and single-transfer routing using calendars, exception dates and GTFS times above 24:00.
- Fastest, balanced and less-crowded scoring; stop autocomplete; segment map/details; departure alternatives. These operate on the imported full Delhi GTFS; actual examples are verified below.
- FastAPI/OpenAPI endpoints, backend tests and React interaction tests.

The distinctive feature is evidence-aware comparison: unknown demand is never interpreted as a quiet bus. Relative demand is not capacity utilisation or a seat guarantee. Map links follow stop order but are straight lines, not road geometry.

## Local setup (Windows PowerShell)

Requires Python 3.11+ (tested on 3.12.10), Node 22.12+ (tested on 24.18.0), npm and curl. Allow at least 3 GB local disk for dependencies and data and preferably 8 GB free RAM during full-network processing; analytics uses a 2 GB DuckDB memory ceiling plus Python memory during GTFS loading, matching and fitting. No database server or API key is needed for the public ticket archive.

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements-lock.txt
.\.venv\Scripts\python -m pip install -e . --no-deps
npm --prefix frontend ci
```

Run from the project root:

```powershell
.\.venv\Scripts\python -m raahi.cli acquire
.\.venv\Scripts\python -m raahi.cli ingest
.\.venv\Scripts\python -m raahi.cli model
.\.venv\Scripts\python -m raahi.cli network
```

`acquire` resumes the official ZIP download and verifies its published SHA-256. `ingest` processes the whole CSV. `model` evaluates both bin widths and refits the selected profile. `network` reports a blocker if no feed exists; it never uses a fabricated network. Processing takes minutes; logs print on stage completion.

### Obtain the full GTFS feed

1. Sign in or register at <https://delhi.transportstack.in/signin>.
2. Open [Delhi Buses: GTFS Static Data](https://delhi.transportstack.in/data-services/datadetails/1).
3. Use Download, submit the requested dataset-access details and then Download Now.
4. Save the authorised ZIP as `data/raw/gtfs.zip` (or pass its path).
5. Run:

```powershell
.\.venv\Scripts\python -m raahi.cli network --gtfs 'C:\path\to\authorised-gtfs.zip'
```

By default the segment model covers the 100 patterns with most unambiguously matched tickets. Change the scope with `--max-patterns 100`. In this archive that is 47.4% of unambiguous matches and 15.2% of all digital ticket records; it covers 2.86% of the 3,498 GTFS stop-sequence patterns. These are sample coverage figures, not whole-system passenger coverage. All valid network routes can be planned; other journeys show unavailable demand. Restart the API after rebuilding data; it loads artifacts at startup. Never replace the full feed with the public sample or an older unrelated feed.

### Start the application

Terminal 1:

```powershell
.\.venv\Scripts\python -m uvicorn raahi.api:app --host 127.0.0.1 --port 8000
```

Terminal 2:

```powershell
npm --prefix frontend run dev
```

Open <http://127.0.0.1:5173>. API documentation: <http://127.0.0.1:8000/docs>.

For a single-server local production build, run `npm --prefix frontend run build`, then start/restart Uvicorn. It serves the built UI at <http://127.0.0.1:8000>. Binding is local-only; no deployment has been performed.

### Configuration

`RAAHI_DATA_DIR` overrides the data root; relative paths resolve from the current working directory. Defaults to this repository's `data/`. The app does not load `.env` automatically: set environment variables in the shell, for example `$env:RAAHI_DATA_DIR='D:\RaahiData'`. `.env.example` documents the setting. No credentials belong in frontend variables.

Raw ZIP/CSV files, DuckDB, model JSON, private diagnostics and dependencies are Git-ignored. Aggregate reports are tracked. Do not publish raw transactions, vehicle identifiers or licensed GTFS archives.

## Demonstrate the current real-data build

The full feed is already available locally at `data/raw/gtfs.zip`. Start the app and click **Try a journey with demand data**. The evidence-searched preset is **Hamdard Nagar / Sangam Vihar to Badarpur M B Road / Rajiv Gandhi Stadium, 24 November 2026, 20:00 IST**. The comparison is recomputed by the planner: 717ADOWN is the 19-minute fastest option (sampled-demand index 99); 544UP is 23 minutes (index 84), both with complete segment coverage and Moderate evidence. The UI describes a four-minute trade-off and 15 index points lower demand. These points are not a percent reduction in passengers or occupancy. This is one illustrative case from 1,200 direct candidate searches, not a representative benefit estimate. The named official example, Anand Vihar to Connaught Place, currently returns a schedule journey without usable crowd history.

Inspect a segment and compare +15/+30/+60-minute departures. Open **Demand explorer** to change route and weekday/weekend date; default 717AUP is selected by actual volume. **Our evidence** shows route and segment validation, the same-slot production method and seasonal comparison, 32.0% matching coverage, and limitations. See [submission/demo-script.md](submission/demo-script.md).

## API

| Endpoint | Purpose |
|---|---|
| `GET /health` | Service/data/routing readiness |
| `GET /api/v1/stops?q=...` | GTFS stop autocomplete; explicit unavailable state without network |
| `GET /api/v1/routes?q=...` | Search actual ticket route labels |
| `POST /api/v1/journeys/search` | Scheduled options and +15/+30/+60 minute alternatives |
| `GET /api/v1/crowding/route-profile?route=717AUP&date=2026-11-23` | Historical route-wide demand profile |
| `GET /api/v1/crowding/segment?key=PATTERN:INDEX&departure=...` | Matched segment evidence |
| `GET /api/v1/analytics/overview` | Quality, coverage, validation and limitations |
| `GET /api/v1/demo` | Example stop pair selected from matched evidence |

Journey JSON input:

```json
{"origin":"2739","destination":"2301","departure":"2026-11-24T18:00:00+05:30","mode":"balanced","transfers":true}
```

The IDs above are a verified Delhi example in the supplied feed. Select other actual IDs from autocomplete. Missing GTFS returns HTTP 503 `GTFS_REQUIRED`; malformed input returns 422. No suitable scheduled route returns an empty list with an explanation. Unknown route history returns 404. No raw transaction endpoint exists.

## Frontend, Design System & User Experience

RAAHI features a consumer-grade, bilingual mobility experience engineered specifically for Delhi's public bus ecosystem:
- **Design System & Visual Identity:** Sandstone terracotta (`#B84226`), Yamuna teal (`#134E48`), and sunlight comfort amber (`#D97706`). High-contrast typography with Devanagari font support.
- **Signature Innovation (Trade-off Comparison):** Instantly highlights the core trade-off (e.g., *"4 min extra for a 15-point lower demand index"*), with side-by-side time and demand comparisons.
- **Directional Stop Resolution:** Resolves opposite-carriageway stop confusion (e.g., UP vs DOWN platforms on MB Road) with platform directional tags and route indicators in autocomplete.
- **Interactive Transit Stepper & Map:** Step-by-step timeline with collapsible intermediate stops, color-coded segment demand chips, and bidirectional hover/click synchronization with the Leaflet map.
- **Complete English & Hindi Localization:** Persistent bilingual toggle (`EN / हिन्दी`) with transliterated stop names and natural commuter phrasing.
- **Accessibility:** Includes keyboard controls, visible focus rings, ARIA combobox semantics and reduced-motion preferences. WCAG 2.2 AA is a target; full conformance and assistive-technology validation are not established.

Design and verification documentation:
- [UI/UX Research & Competitor Benchmark](docs/design/ui-ux-research.md)
- [Design System & Token Specification](docs/design/design-system.md)
- [Frontend Architecture](docs/design/frontend-architecture.md)
- [Bilingual Localization Architecture](docs/design/localization.md)
- [Accessibility Review (WCAG 2.2 AA)](docs/design/accessibility-review.md)
- [Frontend QA & Multi-Viewport Verification Report](docs/design/frontend-qa-report.md)

## Architecture and methodology

Python ingestion -> DuckDB/Parquet -> route/segment model artifacts -> FastAPI -> React/Leaflet/Recharts. Analytics runs offline, separately from the request path. The API reads model artifacts once and caches up to 128 journey queries. See [architecture](docs/architecture.md), [model card](docs/model/model-card.md), [technical note](submission/technical-note.md), and [measured validation](docs/model/model-validation.md).

## Tests and checks

```powershell
.\.venv\Scripts\python -m pytest -q
npm --prefix frontend test
npm --prefix frontend run build
npm --prefix frontend audit
.\.venv\Scripts\python scripts/audit_network.py
.\.venv\Scripts\python scripts/verify_journeys.py
$env:RAAHI_LIVE_API='http://127.0.0.1:8000'
npm --prefix frontend test -- src/App.live.test.tsx
node frontend/scripts/browser-qa.mjs
```

The journey, live React and browser checks require the running API and full processed data. Browser checks use installed Chrome; capture can be repeated with `node frontend/scripts/record-demo.mjs` after `npm --prefix frontend exec -- playwright install ffmpeg`. The opt-in React integration uses real HTTP data in jsdom; map/chart drawing is omitted, so it does not verify browser visuals.

Synthetic tiny GTFS fixtures exist **only in tests**. They verify algorithm correctness without claiming Delhi routing validation. Tests isolate all data in temporary directories. See [QA evidence](docs/qa-report.md) for executed results and browser-verification limits.

## Sources, attribution and limitations

Data source: Delhi Transport Stack / IIIT Delhi; October ONDC e-ticket records. DTC and DoT provide the platform's bus GTFS. Source files retain their own terms; the project's code license does not relicense those datasets. Third-party acknowledgements and AI assistance are recorded in [ATTRIBUTION.md](ATTRIBUTION.md).

Missing vehicle IDs, partial sampling and ticket transaction-time uncertainty prevent exact onboard-load reconstruction. No ETM/APC or route-specific penetration calibration was obtained. No independently validated travel times, live ETAs, bus capacity data or physical-crowding accuracy are claimed. Route demand percentiles are within-route; segment percentiles (when trained) use a shared modeled-segment reference and remain affected by sampling bias. Public map tiles and Google Fonts require internet; data/API functions run locally.

## Submission

[Submission index](submission/README.md) lists the proposal, technical note, demo script and acceptance checklist. Team Turing details and submission links are in [Submit now](submission/submit-now.md). Portal submission remains outstanding. Full GTFS integration and actual HTTP/React-to-API journey checks are complete.

### Included demonstration

`submission/demo.mp4` is the actual application walkthrough (silent, with explanatory DEMO GUIDE annotations); `submission/demo.webm` is the original browser capture. The proposal and technical note are supplied as editable Markdown and visually checked PDFs. See the submission index for the exact file list.

## Team and source

Team Turing: Vishal Shukla, Sujit Verma and Saurabh Kumar.

Source: https://github.com/Vishalshukla6395/raahi-delhi-transit

[Submission handoff and upload files](submission/submit-now.md). Create a verified source/deliverable ZIP with `python scripts/package_submission.py`; raw data and dependencies are excluded.
