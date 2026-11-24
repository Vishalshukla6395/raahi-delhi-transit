# RAAHI Bilingual Localization Architecture (English & Hindi)

## 1. Context & Motivation

Public transportation in Delhi serves millions of Hindi-speaking and bilingual commuters, students, office workers, and elderly citizens every day. A truly world-class Indian transit solution cannot be an English-only dashboard. 

RAAHI implements a complete, authentic bilingual architecture supporting **English (en)** and **Hindi (hi)**, preserving user state across language changes without resetting active searches, itineraries, or filters.

---

## 2. Localization Infrastructure (`src/i18n.ts`)

### 2.1 Structured Dictionary Architecture
User-facing strings are decoupled from JSX into a typed localization dictionary (`translations.en` and `translations.hi`).
- **Zero Raw Strings:** Navigation, search placeholders, preference descriptions, trade-off comparisons, timeline steps, map legends, and statistical metrics are centralized.
- **Dynamic Interpolations:** Functions handle pluralization, metric formatting, and compound sentences (e.g., `tradeoffSummary(extraMin, lowerPoints)`).
- **Persistence:** Commuter's language preference is stored in `localStorage.raahi_lang` and defaults to `"en"`.

### 2.2 Delhi Bus Stop Transliteration & Directional Guidance
Delhi commuters often search for stops using Devanagari or look for recognized local Hindi names (e.g., *अंबेडकर नगर टर्मिनल*, *हमदर्द नगर / संगम विहार*, *कनॉट प्लेस*, *कश्मीरी गेट*).
- `stopHindiMap`: Maps canonical GTFS stop names to authoritative Hindi spellings.
- In Hindi mode, stop cards display both the Devanagari name and canonical English name:  
  `हमदर्द नगर / संगम विहार (Hamdard Nagar / Sangam Vihar)`.
- Directional platform pills clarify UP vs DOWN carriageways:
  - `पूर्व दिशा / UP (बदरपुर, ओखला की ओर)`
  - `पश्चिम दिशा / DOWN (महरौली, साकेत की ओर)`

---

## 3. Localized Commuter Phrasing

Rather than robotic machine translation, Hindi phrases reflect natural transit terminology used on Delhi Transport Corporation (DTC) and Delhi Metro signage:

| English Interface Concept | Conventional Literal (Avoided) | RAAHI Natural Commuter Hindi |
|---|---|---|
| Journey planner | यात्रा योजनाकार | **सफर योजना** |
| Demand explorer | मांग अन्वेषक | **मांग अन्वेषण** |
| Less crowded | कम भीड़भाड़ वाला | **कम भीड़** |
| Find my journey | मेरी यात्रा खोजें | **सफर खोजें** |
| Intermediate stops | मध्यवर्ती ठहराव | **मध्यवर्ती स्टॉप** |
| Transfer at Stop X | स्टॉप X पर स्थानांतरित करें | **Stop X पर बस बदलें** |
| 4 min extra · 15 points lower demand | 4 मिनट अतिरिक्त · 15 अंक कम मांग | **4 मिनट अतिरिक्त सफर · 15 अंक कम अपेक्षित भीड़ सूचकांक** |
| Ticket records analysed | विश्लेषण किए गए टिकट रिकॉर्ड | **विश्लेषित टिकट रिकॉर्ड** |

---

## 4. Preservation of Numerical & Time Standards
- **Timezone:** Always Indian Standard Time (`IST`, `Asia/Kolkata`).
- **Number Formatting:** Standard Indian numbering system via `Intl.NumberFormat('en-IN')` (e.g. `2,559,899` records).
- **Canonical IDs:** GTFS stop IDs (`2300`, `2301`, `2739`) and route numbers (`544UP`, `717ADOWN`) remain canonical across languages to prevent search discrepancies.
