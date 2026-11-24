# RAAHI Redesign Plan

## Sprint Status: SPRINT 2 — Core Product Transformation (IN PROGRESS)

---

## Research Synthesis

### Why Best-in-Class Transit Apps Work

**Citymapper / Transit App / Google Maps Transit:**
- Separation of concerns: search → compact list → detail drill-down
- Map is always visible, never hidden by content
- Primary decision: route selection (time vs comfort)
- Secondary detail: stop-by-stop, available on demand
- Demand/crowding shown as an inline scent, not buried below

**Key Principle:** Show the trade-off decision first. Everything else is secondary.

---

## Critical Problems Found

### Architecture
1. **Single scrollable left column** (480px) contains: hero text + search form + preferences + results + trust footer
2. **Journey details are in the RIGHT column**, below the map — requiring scroll to see them
3. Both panels have `overflow-y: auto` → competing internal scrollbars
4. The tradeoff hero banner (the most important thing) is buried inside journey details
5. Map height hardcoded at 480px when journey selected — not enough for south Delhi routes

### UX
1. Journey results list visible immediately but details require scrolling right panel
2. Alternative departure times at the very bottom — rarely seen
3. Segment color strip is interactive but users don't discover it
4. Tradeoff comparison: "Same journey time" text is weak when crowding differs

### Visual
1. Hero text ("A little less rush") occupies prime left-panel space that should be results space after search
2. Scale note (11px) is too small and verbose
3. Journey cards show duration prominently but not departure time
4. Demand index number means nothing to commuters without context

---

## New Layout Architecture

### Desktop (≥1024px): True 3-Panel

```
┌─────────────────────────────────────────────────────────────┐
│ RAAHI राही    [Journey Planner] [Demand] [Evidence]   EN/हि │ ← 60px sticky header
├──────────┬────────────────┬───────────────────────────────-─┤
│  SEARCH  │  JOURNEY LIST  │           MAP                   │
│  panel   │  panel         │                                 │
│  340px   │  320px         │   flex-1 (fills remaining)      │
│          │                │                                 │
│  Stops   │  Card 1 ★     │   ┌──────────────────────────┐  │
│  Date    │  Card 2        │   │  Leaflet map             │  │
│  Time    │  Card 3        │   │  (always full height)    │  │
│  Prefs   │  ─────────     │   │                          │  │
│  Search  │  Alt times     │   └──────────────────────────┘  │
│          │                │                                 │
│  Demo ↓  │                │  ┌──────────────────────────┐  │
│          │                │  │  JOURNEY DETAIL (selected)│  │
│          │                │  │  ═══ TRADEOFF HERO ═══    │  │
│          │                │  │  Timeline / stops         │  │
│          │                │  └──────────────────────────┘  │
└──────────┴────────────────┴────────────────────────────────┘
```

### Mobile (≤768px): 
- Full screen search → results list → detail view (3 screens, back navigation)
- Map accessible via toggle button, not default view

---

## Design System

### Colors (Retained — well chosen)
- Brand: `--raahi-terracotta: #b84226` + `--raahi-teal: #134e48`
- Demand scale: low (green) → typical (blue) → higher (amber) → highest (red)
- Background: warm near-white `#fbfbf9`

### Typography (Refined)
- Wordmark: Manrope 800
- Body: DM Sans 400–650
- Devanagari: Noto Sans Devanagari

### New Layout Tokens
```css
--panel-search: 340px;
--panel-list: 320px;
--header-height: 60px;
```

### Journey Card Redesign
Show: departure time, arrival time, duration, route numbers, demand, transfer
Remove: verbose evidence text from card summary

### Tradeoff Hero Redesign
Visual bar comparison showing time vs demand trade-off
Clear: "+4 min, −15 demand points" in large readable format

---

## Implementation Priority

1. ✅ Document + plan
2. 🔄 Core 3-panel layout CSS
3. 🔄 Journey card redesign (compact, scannable)
4. 🔄 Tradeoff hero (prominent visual comparison)
5. 🔄 Map improvements (auto-fit, full height)
6. 🔄 Journey timeline improvements
7. 🔄 Mobile responsive
8. ⬜ Demand explorer
9. ⬜ Evidence page
10. ⬜ Hindi localization audit
11. ⬜ Accessibility pass
12. ⬜ Browser testing at multiple viewports
