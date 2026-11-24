# Phase 1 interface refinement — 24 November 2026

This pass builds on the existing bilingual, three-panel RAAHI interface. It keeps the current theme, components, API and data model. No backend ranking or modeling logic was changed.

## Screens reviewed and refined

1. **Journey search — simplified.** One title and subtitle replace the tagline, eyebrow and coverage paragraph. The preference descriptions are now “Shortest journey”, “Time & demand” and “Lower expected demand”. The search button is “Find journeys”. Confirmed-stop IDs and selection help remain visible. Coverage and scoring details move to Our Evidence. The existing demo preset, transfers, date/time controls and quick departures remain functional.
2. **Journey options and details — preserved with clearer wording.** Cards retain duration, boarding/arrival times, routes, transfers, demand and evidence coverage. Details retain segment inspection, intermediate stops, later departures and the time/demand comparison. The short historical-data and no-seat-guarantee explanation remains near demand results. Expanded intermediate-stop lists no longer repeat the final destination as an intermediate stop.
3. **Demand explorer — simplified.** “Demand by route” and “Demand through the day” replace promotional headings. Route/date controls, chart and time-by-time evidence remain. Dataset totals move to Our Evidence. The sampled-demand versus occupancy explanation remains next to the chart and in the explanatory panel.
4. **Our Evidence — retained and organized.** Dataset totals, coverage, both ranking weight sets, detour bounds, validation tables, chronological-selection caveats and scientific limits remain here. Hindi wording now preserves the conditional-scope and independent-test caveats as well.

## Layout and behavior corrections

- Shorter descriptions keep Find journeys visible at the tested desktop and phone sizes, including after stops are confirmed.
- Phone date and time stay side by side. Explorer controls use a bounded two-column grid, preventing the date field from extending beyond the card.
- The compact phone/tablet header retains navigation and language controls; the secondary status badge is hidden at narrower widths. Icon-only navigation keeps accessible names.
- Tablet panels no longer overlap. Journey cards and departure comparisons share a scrollable list at the constrained tablet breakpoint; the stacked tablet view no longer reserves a full-screen empty search-panel height.
- Map chips avoid Leaflet zoom controls. Legend colors and translated demand labels match the existing demand-index boundaries.
- Leave now sets both date and time in IST. +15/+30/+60 act on the selected departure, including date rollover, independently of the browser's timezone.
- Language switching updates the document language and preserves the selected journey. Official stop names remain available; mapped Hindi names are shown where the existing dictionary provides them.

## Verification

Run `node frontend/scripts/phase1-refinement-qa.mjs` with the local API and Vite UI running. The generated matrix is `data/reports/phase1-refinement-qa.json`; accepted screenshots are in `docs/screenshots/refinement/`. The later responsive-list correction is independently rerun at 768, 390 and 360 pixels in both languages and recorded in `data/reports/phase1-refinement-mobile-qa.json`; that check also requires a complete first journey card to fit inside its list. Set `RAAHI_QA_WIDTHS=768,390,360` to repeat the focused run.

The browser matrix covers English and Hindi at 1920×1080, 1440×900, 1280×720, 900×900, 768×1024, 390×844 and 360×800. It checks actual stop autocomplete, confirmation and validation, midnight offsets, IST Leave now, the real covered journey, all three preferences on the representative desktop case, segment/timeline controls, language switching, explorer filters, evidence, horizontal bounds, and button visibility without scrolling. Phone sizes use Chrome touch emulation.

All 14 language/viewport combinations passed. The six responsive follow-up cases also passed after the phone-list correction. The focused React suite passed all 11 tests, including the opt-in actual local API integration. TypeScript and the production build passed. No model refit or backend test rerun was needed for this frontend-only pass.

The existing walkthrough was recaptured against the current built interface. `submission/demo.webm` is the original browser video; `submission/demo.mp4` is its converted export and was fully decoded for verification. The approximately 118-second video is silent and annotated with the same scientific limits. Recording selectors and the demo setup instructions now use the simplified labels.

This is local desktop-browser and emulated-phone verification, not physical-handset or field crowding validation. It does not establish onboard occupancy, live arrival accuracy, seat availability, or rider impact. No external publication, deployment or submission is part of this pass.

## Screenshot index

| Step | English desktop | Hindi desktop | English phone | Hindi phone |
|---|---|---|---|---|
| Search | [1280](../screenshots/refinement/1280-en-search.png) | [1280](../screenshots/refinement/1280-hi-search.png) | [390](../screenshots/refinement/390-en-search.png) | [390](../screenshots/refinement/390-hi-search.png) |
| Journey | [1280](../screenshots/refinement/1280-en-journey.png) | [1280](../screenshots/refinement/1280-hi-journey.png) | [390](../screenshots/refinement/390-en-journey.png) | [390](../screenshots/refinement/390-hi-journey.png) |
| Explorer | [1280](../screenshots/refinement/1280-en-explorer.png) | [1280](../screenshots/refinement/1280-hi-explorer.png) | [390](../screenshots/refinement/390-en-explorer.png) | [390](../screenshots/refinement/390-hi-explorer.png) |
| Evidence | [1280](../screenshots/refinement/1280-en-evidence.png) | [1280](../screenshots/refinement/1280-hi-evidence.png) | [390](../screenshots/refinement/390-en-evidence.png) | [390](../screenshots/refinement/390-hi-evidence.png) |
