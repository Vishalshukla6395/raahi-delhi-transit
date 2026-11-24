# Attribution and data terms

Transit data: **Delhi Transport Stack / Centre for Sustainable Mobility, IIIT Delhi**. October ticket records originate from ONDC e-ticketing. Platform bus GTFS providers are DTC and Delhi Transport Department. [Official hackathon](https://delhi.transportstack.in/hackathon/) and [dataset README](https://pub-091bd9e794bb4877b10b29e6df80f065.r2.dev/2026-10/README.md).

The platform's dataset licence and download instructions were inspected. Access to the complete feed follows registration/request/download. No raw datasets or vehicle identifiers are included in the source repository. Data retains its original terms; this project's code licence does not grant data redistribution rights. Derived aggregates are identified as RAAHI outputs, not official occupancy measurements. Review the applicable downloaded agreement before external publication.

Libraries: React and React DOM (MIT); Vite and Vitest (MIT); TypeScript (Apache-2.0); Leaflet (BSD-2-Clause); Recharts (MIT); Lucide (ISC); FastAPI (MIT); Uvicorn (BSD-3-Clause); DuckDB (MIT); pandas (BSD-3-Clause); NumPy (BSD-3-Clause); PyArrow (Apache-2.0); pytest (MIT); httpx (BSD-3-Clause); Playwright (Apache-2.0; local QA and recording only); ReportLab (BSD); Pillow (MIT-CMU). Installed package licence files remain authoritative. No claim that all dependencies share the same licence.

Map attribution remains visible in the app: OpenStreetMap contributors. Standard OSM raster tiles use the browser cache and visible attribution; no tile archive or prefetch feature is provided. The former CARTO URL was removed after actual browser inspection showed API-key-required placeholders. Public tile requests and Google Fonts require internet; no map service key is embedded. Fonts: DM Sans and Manrope under SIL Open Font License.

AI assistance: OpenAI Codex assisted with research, architecture, implementation, tests and documentation. The team must review the code, data assumptions and submission before representing the work. No human review, user study or live transport validation is implied by AI assistance.
