# RAAHI Frontend Architecture & Implementation Plan

## 1. Architectural Principles

1. **Consumer-Grade Mobility Experience:** Fast, responsive, intuitive, and reassuring.
2. **Scientific Honesty & Layered Disclosure:** Plain language for daily passengers; deep empirical metrics and limitations for transit planners and hackathon judges.
3. **Backend Contract Preservation:** Strictly preserve existing FastAPI `/api/v1` endpoints, data schemas, validation calculations, and error payloads.
4. **Resilient Localized State:** State persists seamlessly across language switches (English <-> Hindi) without reloading or resetting form inputs.
5. **Universal Accessibility:** Strict adherence to WCAG 2.2 AA (contrast, keyboard navigation, visible focus, ARIA semantics).

---

## 2. Component Hierarchy

```
App.tsx
├── Header (Brandmark, Navigation Tabs, Bilingual Toggle, System Status)
│
├── [Tab = "plan"] Passenger Journey Planner
│   ├── SearchPanel
│   │   ├── StopSearch (From / Origin Autocomplete with Platform/Route cues)
│   │   ├── SwapButton (Animated Direction Swap)
│   │   ├── StopSearch (To / Destination Autocomplete)
│   │   ├── DateTimeSelector (Date, Time, Quick Offset Chips: Now, +15m, +30m, +1h)
│   │   ├── ModeSelector (Fastest, Balanced, Less Crowded with plain-language cards)
│   │   ├── TransferOption (Single-transfer checkbox)
│   │   └── SearchAction (Submit Button with busy/spinner state)
│   │
│   ├── JourneyResultsView
│   │   ├── TradeoffHeroBanner (The signature innovation: dynamic extra-time vs lower-demand comparison)
│   │   ├── JourneyCardsList (Recommended, Fastest, Lower-Demand options)
│   │   ├── JourneyTimeline (Transit stepper, collapsible intermediate stops, segment demand)
│   │   └── DepartureOpportunities (Later departure comparison: +15m, +30m arrival/demand trade-offs)
│   │
│   └── MapPanel
│       └── JourneyMap (Leaflet Map, Custom SVG Markers, Polylines, Hover/Click Sync, Legend)
│
├── [Tab = "explore"] Demand Explorer (Route-level Analytics)
│   ├── RouteSelector & DatePicker
│   ├── HourlyDemandAreaChart (Recharts with Morning/Evening peak highlighting)
│   ├── DemandDataTable (Time, Expected Passengers, Demand Index, Confidence)
│   └── DailyCitywidePattern (Bar chart of aggregate October hourly traffic)
│
└── [Tab = "evidence"] Evidence & Scientific Transparency
    ├── CommuterSummaryCard (What the model is and is not)
    ├── CoverageStatsGrid (2.56M records, 32.0% single-path GTFS match, 100 modeled patterns)
    ├── ValidationTable (Chronological train/validate WAPE, baseline comparison)
    ├── SegmentValidationTable (Same-slot production vs seasonal benchmarks)
    └── MethodologicalLimitations (Explicit boundary documentation)
```

---

## 3. Bilingual Localization Architecture (`src/i18n.ts`)

Instead of scattered hardcoded strings, all user-facing copy is managed in a typed localization dictionary supporting `en` and `hi`:
- `t(key, params)` helper with template interpolation.
- State managed via React context or clean state hook, persisted in `localStorage`.
- Hindi transliterations for major Delhi stops and landmarks to facilitate intuitive search and reading for Hindi commuters.

---

## 4. Directional Stop Resolution (Section 19 Fix)

To address the issue where commuters inadvertently picked opposing-direction stops (such as selecting stop 2300 instead of 2301 and getting an 81-minute loop via Badarpur Border):
1. **Enriched Stop Metadata in Autocomplete:** Autocomplete suggestions display directional hints (e.g. `UP · Towards Badarpur / Okhla` vs `DOWN · Towards Mehrauli / Saket`) derived from pattern terminuses and route suffixes.
2. **Commuter Direction Warnings:** When an itinerary involves an extensive detour (>45 min) that terminates near the origin or returns to the same stop name, the UI provides a helpful advisory note: *"Did you mean the opposite platform across the street? Look for the platform heading in your destination direction."*

---

## 5. Map & Timeline Coordinated Interaction

- When a commuter hovers or taps a timeline segment in `JourneyTimeline`, `JourneyMap` highlights the corresponding polyline segment with a halo effect and centers it in view.
- When a user taps a polyline segment on the Leaflet map, the timeline automatically scrolls to and expands that specific step, showing segment details (observed days, tickets sampled, historical range, and confidence level).
