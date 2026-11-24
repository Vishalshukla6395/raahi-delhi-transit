# RAAHI Design System & Token Specification

## 1. Brand Identity & Design Tokens

### 1.1 Color Palette
RAAHI uses a deliberate, context-rich color system inspired by the architectural heritage and transit network of Delhi.

```css
:root {
  /* Brand Primary: Delhi Sandstone Terracotta */
  --raahi-terracotta-50:  #fdf4f2;
  --raahi-terracotta-100: #fbe6e3;
  --raahi-terracotta-200: #f7ceca;
  --raahi-terracotta-500: #d45638;
  --raahi-terracotta-600: #b84226; /* Primary Action */
  --raahi-terracotta-700: #94321b; /* Pressed / Darker Brand */

  /* Brand Secondary: Yamuna Deep Teal */
  --raahi-teal-50:  #f0fdfa;
  --raahi-teal-100: #ccfbf1;
  --raahi-teal-600: #134e48; /* Navigation / Headers */
  --raahi-teal-700: #0f3d38;
  --raahi-teal-900: #092623; /* Deep Ink */

  /* Brand Accent: Sunlight Amber (Comfort & Trade-offs) */
  --raahi-amber-50:  #fffbeb;
  --raahi-amber-100: #fef3c7;
  --raahi-amber-500: #f59e0b;
  --raahi-amber-600: #d97706; /* Trade-off highlight */
  --raahi-amber-700: #b45309;

  /* Neutral Surface & Canvas */
  --raahi-bg:           #fbfbf9; /* Soft cream-white, zero eye strain */
  --raahi-surface:      #ffffff;
  --raahi-surface-sub:  #f5f5f1;
  --raahi-border:       #e6e6de;
  --raahi-border-focus: #b84226;

  /* Typography Colors */
  --raahi-text-primary:   #1a1f1d; /* WCAG AAA on white */
  --raahi-text-secondary: #52605b;
  --raahi-text-muted:     #788782;
  --raahi-text-inverse:   #ffffff;

  /* Semantic Crowding Scale */
  --crowd-low:       #0d7a5f; /* Index 0-25 */
  --crowd-low-bg:    #e6f7f2;
  --crowd-typical:   #2563eb; /* Index 26-50 */
  --crowd-typical-bg:#eff6ff;
  --crowd-higher:    #d97706; /* Index 51-75 */
  --crowd-higher-bg: #fffbeb;
  --crowd-highest:   #dc2626; /* Index 76-100 */
  --crowd-highest-bg:#fef2f2;
  --crowd-unknown:   #64748b;
  --crowd-unknown-bg:#f1f5f9;

  /* Spatial Grid & Radii */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 24px;
  --space-2xl: 32px;

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-full: 9999px;

  /* Elevation / Shadows */
  --shadow-sm: 0 1px 2px rgba(18, 38, 34, 0.05);
  --shadow-md: 0 4px 12px rgba(18, 38, 34, 0.08);
  --shadow-lg: 0 12px 28px rgba(18, 38, 34, 0.12);
  --shadow-focus: 0 0 0 3px rgba(217, 119, 6, 0.35);
}
```

### 1.2 Typography Hierarchy
- **Latin Display & Headings:** `DM Sans`, `Manrope`, system fallback.
- **Devanagari (Hindi) Support:** `Noto Sans Devanagari`, `Kohinoor Devanagari`, system Hindi font.
- **Sizes & Weights:**
  - H1 / Hero: 28px (Desktop 32px), weight 750, line-height 1.2
  - H2 / Section: 20px (Desktop 22px), weight 700, line-height 1.3
  - H3 / Card Title: 16px (Desktop 17px), weight 650, line-height 1.4
  - Body: 14px (Desktop 15px), weight 400/500, line-height 1.5
  - Caption / Micro: 12px, weight 550, line-height 1.4

---

## 2. Component Specifications

### 2.1 Navigation Bar
- Top-anchored unified header (height 68px).
- Left: Logo icon + Wordmark **RAAHI** + Devanagari **राही** + subtitle **Delhi Comfort Intelligence · दिल्ली सफर समझदारी**.
- Center: Tab Segmented Control (Journey Planner, Demand Explorer, Evidence & Methodology).
- Right:
  - Language Switcher: Pill button toggling `[ English | हिन्दी ]`.
  - System Readiness Status Indicator (live GTFS network status).

### 2.2 Journey Search Card
- Origin and Destination inputs with floating labels and icon adornments (`MapPin`, `Navigation`).
- Clear swap button (`ArrowUpDown`) with rotational hover transition.
- Autocomplete suggestions with:
  - Prominent stop name in bold.
  - Directional platform pill (`UP · Towards Badarpur` / `DOWN · Towards Mehrauli`).
  - Top passing route numbers (e.g., `544UP`, `717ADOWN`).
  - Canonical Stop ID badge (`Stop 2301`).
- Date picker & Time picker with Quick Departure Chips:
  - `Now` (अभी)
  - `+15 min`
  - `+30 min`
  - `+1 hr`
- Mode selector (Radio chips):
  - **Fastest** (सबसे तेज़): "Optimizes for shortest scheduled travel time"
  - **Balanced** (संतुलित): "Recommended balance of quick arrival and lower expected crowd"
  - **Comfort** (कम भीड़): "Prioritizes historically less crowded buses with a bounded detour"
- Single-transfer checkbox with clear description.
- Action button: Large, prominent `Find my journey` (सफर खोजें) with loading spinner state.

### 2.3 Signature Innovation: Trade-off Comparison Hero Card
When a journey alternative provides lower expected passenger demand compared to the fastest option:
- Render a dedicated Hero Banner above the journey list.
- Headline: **"4 min extra for a 15-point lower expected demand index"** (4 मिनट अतिरिक्त सफर · 15 अंक कम अपेक्षित भीड़).
- Visual side-by-side metric comparison:
  - Fastest option: `19 min` · `Index 99` (High Demand)
  - Recommended option: `23 min` · `Index 84` (Moderate Demand)
- Transparent caveat: Explains that index points represent historical ticket volume, not verified onboard passenger occupancy.

### 2.4 Journey Alternative Cards
- Visual state: `default`, `hover`, `active/selected`, `focus-visible`.
- Badges:
  - `Recommended` (अनुशंसित) in Terracotta/Teal.
  - `Fastest` (सबसे तेज़) in Deep Teal.
  - `Lower Demand` (कम भीड़) in Amber/Green.
- Key figures: Total journey duration in large bold numerals (`23 min`), departure/arrival times, route numbers in transit pill badges, transfer count.
- Demand index gauge bar showing relative 0-100 level with color-coded dot and category label.

### 2.5 Transit Journey Timeline
- Replaces raw numbered stop lists with an interactive transit stepper:
  1. **Boarding Step:** Boarding time, stop name with origin icon, platform direction.
  2. **Transit Leg Card:** Bus route pill (e.g. `Bus 544UP`), scheduled travel time, collapsible intermediate stops badge (`6 intermediate stops · Click to view`).
  3. **Transfer Step (if applicable):** Walking transfer icon, transfer stop name, scheduled connection buffer (e.g. `5 min transfer window`).
  4. **Alighting Step:** Arrival time, destination stop name with destination pin.
- **Segment Demand Chips:** Each segment between stops has a color-coded bar showing demand tier; tapping/hovering highlights the segment both in the card and on the map!

### 2.6 Coordinated Leaflet Map
- Custom SVG pins for Origin (Green pin), Destination (Crimson pin), and Transfers (Amber node).
- Directional route polylines colored by demand tier with smooth hover glow.
- Interactive segment inspection: Clicking a map segment scrolls to and expands the timeline stop step; clicking a timeline segment pans and highlights the map segment.
- Floating legend in the bottom right corner with high-contrast text and colored swatches.
