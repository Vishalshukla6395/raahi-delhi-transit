# Final RAAHI refinement verification

Implemented in the existing React frontend and served by the existing local API at http://127.0.0.1:8000/.

## Changes

- Replaced viewport-locked scrolling panels with a content-driven workspace. At 1280px and above, search sits beside the map and alternatives, with selected journey information in its own column. Smaller screens use a stacked layout and page scrolling.
- Made selection distinct from the recommendation. Retained actual API ranking, route numbers, evidence strength, missing and partial demand semantics, and the existing English/Hindi content.
- Added preference icons, readable labels, larger controls and a concise selected journey summary. Hid confirmed technical stop IDs visually while retaining accessible confirmation and directional disambiguation in autocomplete.
- Put the computed plain-language tradeoff first; its time/demand chart expands on demand. Retained absolute demand colours, including red for an index of 84 despite its improvement over 99.
- Collapsed later-departure comparisons by default. Expanded options show actual boarding/arrival times, API duration, elapsed time from the original request, and demand.
- Explained that total duration includes initial waiting. Added the actual scheduled connection wait to transfer instructions.
- Added a Show entire journey control. Map fitting now accounts for the legend and controls and reruns after a container resize. Selecting map segments and journey cards retains existing synchronization.
- Mobile searches navigate to results; selecting a journey navigates to its map. Intermediate stops remain collapsed by default.
- Kept the limitation near demand results: Estimated from historical ticket data, not live occupancy.

## Verification

Production build: passed (`npm --prefix frontend run build`).

Frontend: 11 tests passed, including real HTTP integration (`RAAHI_LIVE_API=http://127.0.0.1:8000`).

Backend: 45 tests passed (`.venv/Scripts/python -m pytest -q`). One existing Starlette/httpx deprecation warning remains.

Chrome checks passed at each requested viewport in English and Hindi:

| Width | Height | Result |
| --- | --- | --- |
| 1920 | 1080 | Pass |
| 1600 | 900 | Pass |
| 1440 | 900 | Pass |
| 1366 | 768 | Pass |
| 768 | 1024 | Pass |
| 390 | 844 | Pass |
| 360 | 800 | Pass |

Checked real searches and all three preferences, autocomplete, selected-versus-recommended state, departure selection, segment inspection, map zoom/refit, language switching, expandable instructions, missing demand, explorer and evidence screens, page overflow and nested panel clipping. No browser JavaScript errors were observed. A separate real Ambedkar Nagar Terminal to Connaught Place search verified transfer instructions, computed waiting time, intermediate-stop expansion, mobile result navigation, map refitting during responsive resize, and explorer route/date filters.

Machine-readable results: [viewport report](../../data/reports/final-refinement-qa.json), [interaction report](../../data/reports/final-refinement-interactions.json).

Repeat browser checks with `npm --prefix frontend run qa:refinement`; run the supplementary interaction script from frontend with `node scripts/final-refinement-interactions-qa.mjs`. Requires the running local API and installed Chrome.

## Visual review

Screenshots: [desktop after](../screenshots/final-refinement/1440-en-journey.png), [phone after](../screenshots/final-refinement/390-en-journey.png), [Hindi phone](../screenshots/final-refinement/360-hi-journey.png), [real transfer](../screenshots/final-refinement/mobile-transfer.png).

The [baseline screenshot](../screenshots/final-refinement/baseline-1440.png) is preserved from the repository's pre-existing refinement capture. The current application was also opened and captured before changes; that initial temporary capture was overwritten during iteration. Visual review compared the old three scrolling columns with the new workspace, then checked desktop, tablet and phone screenshots for hierarchy, wrapping, route fitting and discoverability.

Verification used local automated Chrome and viewport emulation. Physical devices and deployed environments were not tested. Map tiles depend on OpenStreetMap; the existing failure notice remains. Existing unrelated and earlier uncommitted work was preserved; no commit or push was performed.

## Empty-state follow-up

The unselected planner now reclaims the unused details column. A wide interactive map and compact next-step prompt replace the oversized empty result panel. The prompt adapts to the missing departure stop, missing destination or completed stop pair, and focuses the relevant field. The demand legend appears only when a journey exists. No-results messaging is distinct from the initial state. Clearing a selected stop restores the initial layout.

Verified on the running Vite app at port 5173 at all seven requested sizes in English and Hindi, including field focus, partial selection, real search and clearing results. See [empty-state checks](../../data/reports/empty-state-qa.json) and [desktop screenshot](../screenshots/empty-state/1920-en.png). All 11 frontend tests pass, including live API integration.
