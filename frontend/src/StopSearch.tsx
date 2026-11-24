import { useEffect, useId, useState, useRef } from "react";
import { MapPin, Navigation, X } from "lucide-react";
import { request, type Stop } from "./api";
import { type Language, translations, getStopDisplayName } from "./i18n";

/**
 * Known directional metadata for key Delhi bus stop pairs on arterial corridors
 */
const STOP_DIRECTION_HINTS: Record<string, { en: string; hi: string; tag?: string }> = {
  "2300": {
    en: "Westbound / DOWN (Towards Mehrauli, Saket, Central Delhi)",
    hi: "पश्चिम दिशा / DOWN (महरौली, साकेत, केंद्रीय दिल्ली की ओर)",
    tag: "Platform 1",
  },
  "2301": {
    en: "Eastbound / UP (Towards Badarpur, Okhla, Tuglakabad)",
    hi: "पूर्व दिशा / UP (बदरपुर, ओखला, तुगलकाबाद की ओर)",
    tag: "Platform 2",
  },
  "2739": {
    en: "Main Bus Terminal (Departure bays for South/Central routes)",
    hi: "मुख्य बस टर्मिनल (दक्षिण/केंद्रीय दिल्ली रूट बे)",
    tag: "Terminal Bay",
  },
  "7962": {
    en: "Outbound Roadside Bay (Towards Mehrauli-Badarpur Rd)",
    hi: "सड़क किनारे बस बे (महरौली-बदरपुर रोड की ओर)",
    tag: "Roadside Bay",
  },
  "2818": {
    en: "Towards Mehrauli (Westbound)",
    hi: "महरौली की ओर (पश्चिम दिशा)",
  },
  "2848": {
    en: "Towards Badarpur Border (Eastbound)",
    hi: "बदरपुर बॉर्डर की ओर (पूर्व दिशा)",
  },
};

export function StopSearch({
  label,
  value,
  onChange,
  disabled = false,
  lang = "en",
}: {
  label: string;
  value: Stop | null;
  onChange: (s: Stop | null) => void;
  disabled?: boolean;
  lang?: Language;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Stop[]>([]);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [active, setActive] = useState(-1);
  const editing = useRef(false);
  const t = translations[lang] || translations.en;

  useEffect(() => {
    if (value) {
      setQuery(value.name);
    } else if (!editing.current) {
      setQuery("");
    }
    editing.current = false;
  }, [value]);

  useEffect(() => {
    if (!open || query.length < 2) {
      setItems([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setStatus(t.searchingStops);
      request<{ items: Stop[]; available: boolean }>(
        `/stops?q=${encodeURIComponent(query)}`,
        { signal: controller.signal },
      )
        .then((r) => {
          setItems(r.items);
          setActive(-1);
          setStatus(r.items.length ? "" : t.noMatchingStops);
        })
        .catch((e) => {
          if (e.name !== "AbortError") {
            setStatus(t.stopSearchError);
          }
        });
    }, 180);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, open, t.searchingStops, t.noMatchingStops, t.stopSearchError]);

  function choose(s: Stop) {
    editing.current = false;
    onChange(s);
    setQuery(s.name);
    setOpen(false);
    setActive(-1);
  }

  function handleClear() {
    setQuery("");
    setItems([]);
    onChange(null);
    setOpen(false);
  }

  return (
    <div
      className="stop-field"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <label htmlFor={id} className="stop-field-label">
        <span className="label-text">{label}</span>
      </label>
      <div className="input-wrap">
        <span className="input-icon" aria-hidden="true">
          {label.toLowerCase().includes("to") || label.includes("तक") ? (
            <Navigation size={18} />
          ) : (
            <MapPin size={18} />
          )}
        </span>
        <input
          id={id}
          role="combobox"
          aria-expanded={open && items.length > 0}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-describedby={query ? `${id}-selection` : undefined}
          aria-activedescendant={active >= 0 ? `${id}-${active}` : undefined}
          autoComplete="off"
          placeholder={
            disabled
              ? lang === "hi"
                ? "आधिकारिक स्टॉप नेटवर्क प्रतीक्षित"
                : "Waiting for official stop network"
              : t.fromPlaceholder
          }
          value={query}
          disabled={disabled}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setItems([]);
            setActive(-1);
            setStatus("");
            if (value) {
              editing.current = true;
              onChange(null);
            }
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, items.length - 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            }
            if (e.key === "Enter" && open && !value) {
              e.preventDefault();
              const candidate =
                active >= 0
                  ? items[active]
                  : items.length === 1
                    ? items[0]
                    : undefined;
              if (candidate) choose(candidate);
            }
            if (e.key === "Escape") setOpen(false);
          }}
        />
        {query && !disabled && (
          <button
            type="button"
            className="input-clear"
            aria-label={t.clearStop}
            onClick={handleClear}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {query && (
        <small
          id={`${id}-selection`}
          className={`stop-selection ${value ? "confirmed sr-only" : "pending"}`}
        >
          {value
            ? t.selectedStop(value.id)
            : t.selectFromSuggestions}
        </small>
      )}

      {open && query.length >= 2 && (
        <div
          className="suggestions"
          id={`${id}-list`}
          role="listbox"
          aria-label={`${label} ${t.suggestionLabel}`}
        >
          {items.map((s, i) => {
            const hint = STOP_DIRECTION_HINTS[s.id];
            const hintText = hint ? (lang === "hi" ? hint.hi : hint.en) : null;
            const displayName = getStopDisplayName(s.name, lang);

            return (
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                id={`${id}-${i}`}
                key={s.id}
                className={`suggestion-option ${i === active ? "active" : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(s)}
              >
                <div className="suggestion-main">
                  <span className="stop-name">{displayName}</span>
                  <div className="stop-meta">
                    <span className="stop-id-badge">{t.stopUnit} {s.id}</span>
                    {hint?.tag && (
                      <span className="platform-tag">{hint.tag}</span>
                    )}
                  </div>
                </div>
                {hintText && (
                  <div className="stop-direction-hint">
                    <small>{hintText}</small>
                  </div>
                )}
              </button>
            );
          })}
          {!items.length && (
            <p className="no-suggestions" role="status">
              {status || (lang === "hi" ? "स्टॉप खोजने के लिए टाइप करें" : "Type to find stops")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
