# Evidence-led demo walkthrough

The actual Chrome capture is a silent recording with DEMO GUIDE overlays. Run `node frontend/scripts/record-demo.mjs`; it reads the current supported preset from the local API and asserts the stop pair before recording. It never hardcodes journey results in the UI.

## Setup

1. Run `powershell -ExecutionPolicy Bypass -File scripts/start.ps1` from the project root and open http://127.0.0.1:8000.
2. In Journey planner, click **Try a journey with demand data**. The preset is discovered from modeled patterns with complete coverage and Moderate evidence on both options.
3. Confirm the pair and departure returned by `/api/v1/demo`, then select **Less crowded** and search.
4. The current discovered example is Hamdard Nagar / Sangam Vihar to Badarpur M B Road / Rajiv Gandhi Stadium, 24 November 2026 at 20:00 IST. Fastest: 717ADOWN, 19 min, index 99. Less crowded: 544UP, 23 min, index 84. Both complete coverage, Moderate evidence.

## Walkthrough

- **0-12s:** Explain the problem and boundary: historical digital-ticket demand is a proxy; no physical onboard counts or seats are claimed.
- **12-30s:** Search the real pair and show the trade-off card: four more scheduled minutes and 15 lower demand-index points. These points are not percent fewer passengers. Sampling and service frequency may confound the cross-route comparison.
- **30-47s:** Inspect a segment. Read the observed days, supporting records, evidence grade and historical backoff.
- **47-62s:** Compare later departures. Note that a later service can use a different route and that missing demand never counts as low demand.
- **62-77s:** Open Demand explorer and change its route/date. Explain that the curve is passenger-weighted transaction demand, not onboard load.
- **77-94s:** In Our evidence, show 32.0% unique path matching, 100 of 3,498 GTFS patterns modeled, and the dataset coverage disclosure. Explain the comparison: the production same-slot forecast has 69.96% holdout WAPE versus 69.43% seasonal; two-week diagnostics show same-slot ordering agreement of 62.06% and 64.11% versus 61.82% and 63.83%. These close, conflicting measures motivate the simpler method but do not prove a benefit.
- **94-105s:** Close with the real gap: the official Anand Vihar-Connaught Place example currently has no matched crowd history. More ETM/APC evidence, service assignment, capacity calibration and prospective testing are needed.

This is one discovered example from 1,200 direct weekday candidate checks, not a representative benefit estimate. Keep the limitations visible. Never imply a guaranteed quiet bus or physically measured improvement.
