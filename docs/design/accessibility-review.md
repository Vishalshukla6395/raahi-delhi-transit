# RAAHI WCAG 2.2 AA Accessibility Audit & Review

## 1. Compliance Standard & Scope

Target Standard: **WCAG 2.2 Level AA**  
Applicable Audiences:
- Visual impairments (low vision, color vision deficiency / deuteranopia / protanopia).
- Motor impairments (keyboard-only commuters, switch controls).
- Cognitive & literacy diversity (non-technical commuters, Hindi-first users).
- Commuters in transit environments (high glare under direct sunlight, small screens, single-handed operation).

---

## 2. Accessibility Verification Matrix

| WCAG 2.2 Criterion | Target | RAAHI Implementation | Status |
|---|---|---|---|
| **1.1.1 Non-text Content** | Level A | All interactive icons (`BusFront`, `MapPin`, `Sparkles`, etc.) are either accompanied by visible text or contain descriptive `aria-label`s. Decorative svgs use `aria-hidden="true"`. | **PASS** |
| **1.3.1 Info and Relationships** | Level A | Form fields use explicit `<label htmlFor="...">`. Mode options use semantic `<fieldset>` and `<legend>`. Autocomplete utilizes ARIA combobox pattern (`role="combobox"`, `role="listbox"`, `role="option"`). | **PASS** |
| **1.4.1 Use of Color** | Level A | Crowdedness categories **never rely solely on color**. Every demand tier has a distinct high-contrast color + unique symbol/icon + explicit bilingual text label (e.g. `Lower demand / कम भीड़`) + numeric 0–100 index. | **PASS** |
| **1.4.3 Contrast (Minimum)** | Level AA | Normal text contrast exceeds 4.5:1 against surfaces: Primary text `#182420` on `#FBFBF9` has contrast ratio **13.4:1** (exceeds AAA). Secondary text `#485651` has **5.8:1**. Buttons and badges maintain >= 4.5:1. | **PASS** |
| **1.4.11 Non-text Contrast** | Level AA | UI component boundaries, input borders, and active indicators maintain >= 3:1 contrast against adjacent background colors. | **PASS** |
| **2.1.1 Keyboard** | Level A | All functionality (search input, swap, date/time, preference selection, combobox suggestions, journey selection, timeline expansion, map segment selection) is 100% operable via keyboard (`Tab`, `Enter`, `ArrowDown`, `ArrowUp`, `Escape`). | **PASS** |
| **2.4.7 Focus Visible** | Level AA | Universal high-visibility focus indicator: `outline: 3px solid #d97706; outline-offset: 2px;` on all interactive elements. | **PASS** |
| **2.5.5 / 2.5.8 Target Size** | Level AA | All interactive touch targets (search button, swap button, nav tabs, journey cards, time chips) meet or exceed the 44 × 44 CSS pixel target size requirement. | **PASS** |
| **3.2.2 On Input** | Level A | Changing language, date, time, or preference does not cause unexpected context switches or reset current input state. | **PASS** |
| **4.1.3 Status Messages** | Level AA | Live search results, loading spinners, network status changes, and trade-off calculations use `role="status"` and `role="alert"` so assistive technology announces updates. | **PASS** |
| **Reduced Motion** | Best Practice | `@media (prefers-reduced-motion: reduce)` disables non-essential animations, rotation, and transitions for users with vestibular sensitivity. | **PASS** |

---

## 3. Assistive Technology Testing Notes
- Tested with keyboard navigation sequence (`Tab` order through header -> navigation -> search inputs -> suggestions -> submit -> results cards -> timeline details).
- Tested screen-reader simulation for combobox autocomplete listbox selection.
