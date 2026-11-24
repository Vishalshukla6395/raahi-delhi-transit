# RAAHI UI/UX and Product Experience Research

## 1. Executive Summary & Problem Framing

**Project:** RAAHI — Delhi Comfort Intelligence  
**Hackathon:** Transport Stack Hackathon 2026  
**Problem Statement:** Problem 2 — Crowdedness-aware journey planner  
**Core Innovation:** Comparing scheduled journey duration against expected passenger demand derived from historical ONDC e-ticketing data.

Public bus commuters in Delhi face extreme variability in passenger load throughout the day. Conventional journey planners (such as Google Maps or standard timetable lookups) optimize almost exclusively for the shortest travel duration or fewest transfers. However, on congested corridors like the Mehrauli–Badarpur (MB) Road, Ring Road, or Outer Ring Road, a journey that is 4 minutes faster on paper may subject the commuter to an overcrowded bus where boarding is uncomfortable or physically difficult. Conversely, an alternative bus departing within minutes or following a parallel route may experience significantly lower historical demand.

RAAHI's signature value proposition is:
> **"A passenger should immediately understand which journey to take, why it is recommended, and what trade-off they are making."**

---

## 2. Competitive & Reference Product Analysis

To build an experience suited for both daily Delhi commuters and international hackathon evaluation, we examined market leaders in consumer mobility, transit planning, and public transport data systems.

### 2.1 Citymapper
* **Key Strengths:**
  - **Direct comparison across modes & routes:** Side-by-side alternative cards showing total duration, arrival time, and step summary.
  - **Visual route timelines:** Clean vertical timelines showing boarding stop, intermediate stops collapsed into a single expandable count ("5 stops"), and transfer stations.
  - **Trade-off transparency:** Highlighting "Fastest", "Fewest changes", or "Rain-safe" with crisp pill badges.
* **Takeaways for RAAHI:**
  - Never force commuters to scroll through long raw numbered lists of stops. Collapse intermediate stops by default with clear tap-to-expand controls.
  - Display departure and arrival times prominently for every leg.

### 2.2 Transit App
* **Key Strengths:**
  - **High-contrast, memorable branding:** Bold typographic hierarchy, bold route badges (e.g. big route numbers inside colored rounded pills), and minimal cognitive clutter.
  - **Commuter-first mobile design:** Large touch targets, immediate departure countdowns, and glanceable cards.
  - **Inclusive accessibility:** Clear icon + text indicators rather than color-only signals.
* **Takeaways for RAAHI:**
  - Bus route identifiers (e.g., `544UP`, `717ADOWN`) must be prominent visual badges with high contrast.
  - Avoid SaaS dashboard aesthetics. The interface should feel like a premier transit companion tailored for Delhi.

### 2.3 Google Maps (Transit & Crowdedness Updates)
* **Key Strengths:**
  - **Progressive disclosure:** Origin/destination search -> high-level alternative cards -> detailed step-by-step route directions -> segment details.
  - **Crowdedness predictions:** Four-level categorizations ("Usually not crowded", "Usually crowded", etc.) based on historical aggregation rather than speculative real-time guarantees.
  - **Integrated map view:** Route lines rendered on map with start and end pins, synchronized with the active itinerary.
* **Takeaways for RAAHI:**
  - Do not claim physical passenger occupancy or seat guarantees. Use honest, calibrated categorizations: **Lower demand, Typical demand, Higher demand, Highest demand, Data unavailable**.
  - Keep the map synchronized with the timeline: hovering or tapping a leg or segment must highlight the corresponding map segment.

### 2.4 Transport for London (TfL Go)
* **Key Strengths:**
  - **Public service design system:** High contrast, legible typography, clear visual hierarchy, accessible color pairings, and strict WCAG AA adherence.
  - **Accessible journey preferences:** Explaining route trade-offs in plain language rather than technical algorithm parameters.
* **Takeaways for RAAHI:**
  - Replace internal scoring weight formulas (e.g., "Score weights: 65% time, 25% demand...") in the main passenger view with plain, commuter-friendly explanations ("Balances fast travel with historically quieter buses"). Keep mathematical weights accessible via the Methodology tab.

### 2.5 One Delhi & Chartr (Local Delhi Context)
* **Key Strengths & Gaps:**
  - One Delhi and Chartr focus heavily on contactless mobile QR ticketing, live GPS bus tracking, and static timetables.
  - Neither product provides historical crowdedness-aware routing or transparent trade-off comparison between parallel services.
  - Commuters frequently struggle with similarly-named stops across opposing sides of divided arterial roads (UP vs DOWN directions).
* **Takeaways for RAAHI:**
  - Solves the unique Delhi problem of directional stop pairs (e.g. Stop 2300 vs Stop 2301 at Hamdard Nagar) by displaying route indicators and directional cues in autocomplete.
  - Complete English and Hindi bilingual localization is vital for Delhi's diverse commuter base.

---

## 3. Investigation of the Suspicious Route Detour (544UP)

### 3.1 The Reported Symptom
In previous prototype runs, a search from Ambedkar Nagar Terminal to Hamdard Nagar / Sangam Vihar produced a journey where route 544UP traveled past Hamdard Nagar, continued to Badarpur Border, and transferred to another bus returning to Hamdard Nagar.

### 3.2 Root-Cause Engineering Analysis
1. **Directional Stop Identity in GTFS:**
   - In the official Delhi bus GTFS feed, bus stops located on opposite sides of Mehrauli–Badarpur Road have distinct canonical `stop_id`s despite having identical English names:
     - `2300`: *Hamdard Nagar / Sangam Vihar* (DOWN / Westbound carriageway towards Mehrauli / Saket)
     - `2301`: *Hamdard Nagar / Sangam Vihar* (UP / Eastbound carriageway towards Badarpur / Okhla)
   - These stops are physically located ~52 meters apart across the road (`28.511924, 77.249213` vs `28.512060, 77.248708`).
2. **Terminal Origin Direction:**
   - Origin stop `7962` (*AMBEDKAR NAGAR TERMINAL / Khanpur Ambedkar Nagar*) exclusively serves UP (eastbound) patterns including `544UP`, `419AUP`, `448UP`.
   - Route `544UP` departs `7962`, stops at `2301` (UP platform), and terminates at `2640` (*Badarpur Border (T)*). It does *not* call at `2300` because `2300` is on the opposite carriageway.
3. **The Autocomplete Ambiguity:**
   - The previous frontend stop autocomplete displayed:
     - `Hamdard Nagar / Sangam Vihar` · Stop 2300
     - `Hamdard Nagar / Sangam Vihar` · Stop 2301
   - Without route badges or directional labels, a user selecting `2300` asked the routing engine: *"Get me from stop 7962 to stop 2300 specifically"*.
4. **Graph Search Execution:**
   - Because no single bus runs eastward from 7962 directly to westbound stop 2300, the transfer router boarded 544UP, bypassed 2301, traveled to the turnaround terminal at Badarpur Border (`2640`), and boarded westbound route `717AUP` / `525UP` back to `2300`.
   - In physical reality, a commuter getting off at Hamdard Nagar simply alights at `2301` and walks across the crosswalk.

### 3.3 Design & UX Solution
- **Enhanced Stop Autocomplete:** Present stop results with directional context, landmark hints, and top passing route numbers (e.g. `Hamdard Nagar / Sangam Vihar (UP · Towards Badarpur)` serving routes `544UP, 34UP, 717ADOWN` vs `(DOWN · Towards Mehrauli)` serving routes `34DOWN, 411UP`).
- **Commuter Advice Callout:** When a route involves an extensive loop or transfer near the destination, alert the user if an opposing platform stop is directly reachable with zero transfers.

---

## 4. Information Architecture & Navigation Transformation

### Previous Architecture (Flawed)
- A 76px dark left vertical rail with 3 icon buttons.
- An 88px top header with 3 text tabs that completely duplicated the rail.
- A cramped 380px left search sidebar that pushed search results and details below a massive vertical scroll.
- The map was relegated to an idle right panel that had no interactive connection to the timeline.

### New Streamlined Architecture
```
+---------------------------------------------------------------------------------------+
|  [Logo] RAAHI  राही               [ Journey Planner | Demand Explorer | Evidence ]   [ EN | हि ] [Status] |
+---------------------------------------------------------------------------------------+
|  PASSENGER VIEW (Journey Planner):                                                    |
|  +-------------------------------------------+-------------------------------------+  |
|  | LEFT PANE:                                | RIGHT PANE:                         |  |
|  | 1. Intuitive Search Card                  | 1. Interactive Full-Height Map      |  |
|  |    - From / To with Route Badges          |    - Color-coded Demand Polylines   |  |
|  |    - Departure Date & Time + Quick Chips  |    - Custom Stop & Bus Pins         |  |
|  |    - Plain-language Preference Selector   |    - Hover/Click Synchronization    |  |
|  | 2. Signature Trade-off Hero Banner        |    - Floating Map Legend            |  |
|  |    "4 min extra for 15-pt lower demand"   |                                     |  |
|  | 3. Alternative Cards (Recommended / Fast) |                                     |  |
|  | 4. Expandable Transit Journey Timeline    |                                     |  |
|  | 5. Departure Time Opportunities (+15/+30) |                                     |  |
|  +-------------------------------------------+-------------------------------------+  |
+---------------------------------------------------------------------------------------+
|  INTELLIGENCE & TRANSPARENCY VIEWS (Full-width analytical cards):                      |
|  - Demand Explorer: Hourly curve, peak/off-peak windows, route comparison table       |
|  - Evidence & Methodology: Commuter summary, 2.56M ticket audit, WAPE benchmarks      |
+---------------------------------------------------------------------------------------+
```

---

## 5. Visual Identity & Brand Concept

### 5.1 The Name RAAHI (राही)
"Raahi" is the Hindi and Hindustani word for traveler, wanderer, or daily commuter. It embodies journey, guidance, and companionship through the complex, bustling streets of Delhi.

### 5.2 Color Philosophy: Delhi Transit Reality
Rather than generic SaaS blues or synthetic AI purples, RAAHI’s color system is rooted in Delhi’s public landscape:
1. **Heritage Terracotta Brick (`#B84226` / `#D45638`):** Reflects the red sandstone of Delhi’s monuments (Red Fort, Humayun’s Tomb) and the iconic DTC standard fleet warm tones. Signals warmth, human presence, and distinctiveness.
2. **Deep Yamuna Teal (`#134E48` / `#0D3833`):** Reflects stability, calm, and Delhi Metro transfer concourses. Used for typography, structural frames, and primary navigation.
3. **Comfort Gold (`#D97706` / `#F59E0B`):** The signature accent color for trade-offs, comfort recommendations, and smart alerts.
4. **Warm Canvas Sand (`#FBFBF9` / `#F3F3EE`):** Clean, glare-free, high-legibility background.

### 5.3 Semantic Crowding Scale
To guarantee accessibility for color-blind commuters and non-English speakers, every demand tier combines:
- A specific high-contrast color.
- A distinctive shape/icon.
- A clear bilingual text badge.
- A numerical index (0–100 scale).

| Demand Category | Color | Icon | English Label | Hindi Label | Index Range |
|---|---|---|---|---|---|
| Lower | `#0D7A5F` | Leaf / Check | Lower demand | कम भीड़ | 0 – 25 |
| Typical | `#2563EB` | Transit Flow | Typical demand | सामान्य भीड़ | 26 – 50 |
| Higher | `#D97706` | Clock / Busy | Higher demand | अधिक भीड़ | 51 – 75 |
| Highest | `#DC2626` | Alert Peak | Highest demand | अत्यधिक भीड़ | 76 – 100 |
| Unavailable | `#64748B` | Info Circle | Data unavailable | आंकड़े उपलब्ध नहीं | Missing |

---

## 6. Accessibility & Localization Strategy

1. **WCAG 2.2 AA Compliance:**
   - Text contrast ratio > 4.5:1 against backgrounds.
   - Interactive touch targets >= 44x44px.
   - Visible focus indicators (`3px solid #D97706` with `2px offset`).
   - Screen-reader ARIA live regions for journey updates.
2. **Bilingual Localization (English & Hindi):**
   - Seamless, state-preserving language switcher.
   - Devanagari typography with `Noto Sans Devanagari` and Indian English number formatting (`en-IN`).
   - Natural commuter phrasing (e.g., "सफर की योजना बनाएं" rather than robotic literal translations).
   - Stop names display both authoritative English and familiar Hindi transliterations where helpful.

---

## 7. Next Steps in Execution Plan
- **Sprint 2:** Build design tokens, CSS variables, and the bilingual localization provider.
- **Sprint 3:** Re-architect `StopSearch.tsx`, `JourneyMap.tsx`, and `App.tsx` into clean, modular, accessible components with signature trade-off cards.
- **Sprint 4:** Refine Demand Explorer and Evidence views with layered disclosure.
- **Sprint 5 & 6:** Comprehensive browser QA across 6 viewports and full automated regression testing.
