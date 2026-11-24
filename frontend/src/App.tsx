import { useEffect, useState, lazy, Suspense, useMemo } from "react";
import {
  BusFront,
  Route,
  ChartNoAxesCombined,
  ShieldCheck,
  ArrowUpDown,
  Search,
  Info,
  Clock3,
  Layers,
  MapPin,
  TriangleAlert,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sparkles,
  AlertCircle,
  Calendar,
  Languages,
  SlidersHorizontal,
  Footprints,
  ArrowRight,
  Zap,
  Scale,
  Users,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import {
  request,
  pretty,
  crowdColor,
  type Stop,
  type Journey,
  type Segment,
  type SearchResult,
  type Prediction,
} from "./api";
import { StopSearch } from "./StopSearch";
import {
  type Language,
  translations,
  getStopDisplayName,
} from "./i18n";

const JourneyMap = lazy(() =>
  import("./JourneyMap").then((m) => ({ default: m.JourneyMap })),
);

type Quality = {
  total_records: number;
  valid_records: number;
  vehicle_available: number;
  exact_duplicate_surplus: number;
  coverage: {
    last_date: string;
    first_date: string;
    routes: number;
    dates: number;
    sampled_passengers: number;
  };
  top_routes: { id: string; name: string; tickets: number }[];
  hourly: { hour: number; passengers: number }[];
};

type Metrics = {
  mae: number;
  wape: number;
  rank_correlation: number;
  cells: number;
};

type Overview = {
  quality: Quality;
  network: {
    status: string;
    reason?: string;
    matching_coverage?: number;
    modeled_patterns?: number;
    modeled_tickets?: number;
    total_valid_tickets?: number;
    modeled_ticket_share?: number;
    patterns?: number;
  };
  validation: {
    selected_minutes: number;
    scope: string;
    variants: {
      minutes: number;
      baseline: Metrics;
      seasonal: Metrics;
      train_dates: string[];
      validation_dates: string[];
    }[];
  };
  limitations: string[];
  segment_validation?: {
    minutes: number;
    baseline: Metrics;
    same_slot: Metrics;
    seasonal: Metrics;
  } | null;
  model_audit?: {
    segment: {
      metrics: { same_slot: Metrics; seasonal: Metrics };
      within_key_departure_ranking: {
        same_slot: {
          accuracy_with_half_credit_for_prediction_ties: number;
        };
        seasonal: {
          accuracy_with_half_credit_for_prediction_ties: number;
        };
        eligible_pairs: number;
      };
    }[];
  };
};

type Profile = {
  route: string;
  scope: string;
  historical_through: string;
  bin_minutes: number;
  points: ({ time: string } & Prediction)[];
};

const localDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const timeLabel = (s: string) =>
  new Date(s).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
  });

export function App() {
  const [lang, setLang] = useState<Language>(() => {
    try {
      return (localStorage.getItem("raahi_lang") as Language) || "en";
    } catch {
      return "en";
    }
  });

  const t = useMemo(() => translations[lang] || translations.en, [lang]);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const toggleLanguage = (newLang: Language) => {
    setLang(newLang);
    try {
      localStorage.setItem("raahi_lang", newLang);
    } catch {
      // ignore
    }
  };

  const [tab, setTab] = useState("plan");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [bootError, setBootError] = useState("");
  const [reload, setReload] = useState(0);

  // Journey planner state
  const [origin, setOrigin] = useState<Stop | null>(null);
  const [destination, setDestination] = useState<Stop | null>(null);
  const [date, setDate] = useState(localDate());
  const [time, setTime] = useState("18:00");
  const [mode, setMode] = useState("balanced");
  const [transfers, setTransfers] = useState(true);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [journey, setJourney] = useState<Journey | null>(null);
  const [segment, setSegment] = useState<Segment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(true);
  const [expandedStops, setExpandedStops] = useState<Record<string, boolean>>({});
  const [mobileView, setMobileView] = useState<"search" | "results" | "map">("search");

  useEffect(() => {
    if (window.innerWidth > 860 || !result) return;
    const target = mobileView === "map" ? ".map-detail-panel" : ".journey-list-panel";
    document.querySelector(target)?.scrollIntoView({ block: "start" });
  }, [mobileView, result, journey]);

  // Demand explorer state
  const [route, setRoute] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    const c = new AbortController();
    setBootError("");
    request<Overview>("/analytics/overview", { signal: c.signal })
      .then((o) => {
        setOverview(o);
        setRoute((r) => r || o.quality.top_routes?.[0]?.id || "");
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setBootError(
            "RAAHI cannot reach its data service. Check that the API is running, then retry.",
          );
        }
      });
    return () => c.abort();
  }, [reload]);

  useEffect(() => {
    if (!route || !date) return;
    const c = new AbortController();
    setProfileLoading(true);
    setProfileError("");
    setProfile(null);
    request<Profile>(
      `/crowding/route-profile?route=${encodeURIComponent(route)}&date=${date}`,
      { signal: c.signal },
    )
      .then(setProfile)
      .catch((e) => {
        if (e.name !== "AbortError") setProfileError(e.message);
      })
      .finally(() => {
        if (!c.signal.aborted) setProfileLoading(false);
      });
    return () => c.abort();
  }, [route, date]);

  const ready = overview?.network.status === "ready";
  const quality = overview?.quality;

  async function search() {
    if (!origin || !destination) {
      setError(t.missingStops(!origin, !destination));
      return;
    }
    setBusy(true);
    setError("");
    setResult(null);
    setJourney(null);
    setSegment(null);
    setSearched(true);
    try {
      const data = await request<SearchResult>("/journeys/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: origin.id,
          destination: destination.id,
          departure: `${date}T${time}:00+05:30`,
          mode,
          transfers,
        }),
      });
      setResult(data);
      const first = data.journeys[0] || null;
      setJourney(first);
      // On mobile, jump to results after search
      if (window.innerWidth <= 860) setMobileView("results");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const invalidate = () => {
    setResult(null);
    setJourney(null);
    setSegment(null);
    setSearched(false);
    setError("");
  };

  async function loadDemo() {
    try {
      const d = await request<{
        available: boolean;
        origin: Stop;
        destination: Stop;
        reason?: string;
        departure?: string;
        mode?: string;
        transfers?: boolean;
      }>("/demo");
      if (d.available) {
        setOrigin(d.origin);
        setDestination(d.destination);
        if (d.departure) {
          setDate(d.departure.slice(0, 10));
          setTime(d.departure.slice(11, 16));
        }
        if (d.mode) setMode(d.mode);
        if (d.transfers != null) setTransfers(d.transfers);
        invalidate();
      } else {
        setError(d.reason || "No supported demonstration route yet.");
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const applyOffsetMinutes = (offsetMinutes: number) => {
    const base = offsetMinutes === 0 ? new Date() : new Date(`${date}T${time}:00+05:30`);
    if (Number.isNaN(base.getTime())) return;
    const next = new Date(base.getTime() + offsetMinutes * 60_000);
    setDate(new Intl.DateTimeFormat("en-CA", {timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit"}).format(next));
    setTime(next.toLocaleTimeString("en-GB", {timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit"}));
    invalidate();
  };

  return (
    <div className="raahi-app">
      {/* ================================================================== */}
      {/* UNIVERSAL HEADER                                                    */}
      {/* ================================================================== */}
      <header className="raahi-header">
        <div className="header-brand">
          <a
            href="#"
            className="brand-logo"
            aria-label="RAAHI home"
            onClick={(e) => {
              e.preventDefault();
              setTab("plan");
            }}
          >
            <div className="logo-symbol">
              <BusFront size={20} />
            </div>
            <div className="logo-titles">
              <div className="logo-main">
                <span className="wordmark">RAAHI</span>
                <span className="hindi-mark">राही</span>
              </div>
              <span className="tagline">
                {lang === "hi" ? "दिल्ली सफर समझदारी" : "DELHI COMFORT INTELLIGENCE"}
              </span>
            </div>
          </a>
        </div>

        <nav className="header-nav" aria-label="Main navigation">
          {[
            ["plan", t.navPlanner, Route],
            ["explore", t.navExplorer, ChartNoAxesCombined],
            ["evidence", t.navEvidence, ShieldCheck],
          ].map(([id, label, Icon]) => (
            <button
              key={id as string}
              className={`nav-tab ${tab === id ? "active" : ""}`}
              onClick={() => setTab(id as string)}
              type="button"
              aria-label={label as string}
              aria-current={tab === id ? "page" : undefined}
            >
              <Icon size={15} />
              <span className="nav-tab-text">{label as string}</span>
            </button>
          ))}
        </nav>

        <div className="header-actions">
          <div className="lang-switcher" role="group" aria-label="Language switcher">
            <Languages size={14} className="lang-icon" />
            <button
              type="button"
              className={`lang-btn ${lang === "en" ? "active" : ""}`}
              onClick={() => toggleLanguage("en")}
              aria-pressed={lang === "en"}
            >
              EN
            </button>
            <span className="lang-divider">/</span>
            <button
              type="button"
              className={`lang-btn ${lang === "hi" ? "active" : ""}`}
              onClick={() => toggleLanguage("hi")}
              aria-pressed={lang === "hi"}
            >
              हिन्दी
            </button>
          </div>

          <div
            className={`status-pill ${ready ? "ready" : "pending"}`}
            title={ready ? t.statusReady : t.statusPending}
            aria-label={ready ? t.statusReady : t.statusPending}
          >
            <span className="status-dot" />
            <span className="status-text">{ready ? t.statusReady : t.statusPending}</span>
          </div>
        </div>
      </header>

      {/* ================================================================== */}
      {/* BODY                                                                */}
      {/* ================================================================== */}
      {bootError ? (
        <main className="boot-error" role="alert">
          <div className="error-icon-box">
            <TriangleAlert size={36} />
          </div>
          <h1>{t.bootErrorTitle}</h1>
          <p>{t.bootErrorText}</p>
          <button className="raahi-btn primary" onClick={() => setReload(reload + 1)}>
            <RefreshCw size={16} />
            {t.retryButton}
          </button>
        </main>
      ) : !overview ? (
        <main className="boot-error" role="status">
          <div className="raahi-spinner" />
          <h1>{t.bootTitle}</h1>
          <p>{t.bootSubtitle}</p>
        </main>
      ) : !overview.quality.total_records ? (
        <main className="boot-error" role="status">
          <Layers size={36} />
          <h1>{t.noDataTitle}</h1>
          <p>{t.noDataText}</p>
          <button className="raahi-btn primary" onClick={() => setReload(reload + 1)}>
            {t.checkReadiness}
          </button>
        </main>
      ) : (
        <>
          {/* ============================================================== */}
          {/* TAB 1: JOURNEY PLANNER — 3-PANEL WORKSPACE                     */}
          {/* ============================================================== */}
          {tab === "plan" && (
            <main className={`planner-workspace ${journey ? "with-journey" : "awaiting-journey"}`}>
              {/* ---- PANEL 1: SEARCH FORM ---- */}
              <section className="search-panel" aria-label="Journey search">
                <div className="search-panel-inner">
                  {/* Brand micro-header */}
                  <div className="search-brand-mini">
                    <h1 className="search-title">{t.searchTitleMain}</h1>
                    <p className="search-subtitle">{t.searchIntro}</p>
                  </div>

                  {/* Search Form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void search();
                    }}
                  >
                    <div className="stop-pair-container">
                      <StopSearch
                        label={t.fromLabel}
                        value={origin}
                        disabled={!ready || busy}
                        lang={lang}
                        onChange={(s) => {
                          setOrigin(s);
                          invalidate();
                        }}
                      />
                      <button
                        type="button"
                        className="swap-btn"
                        aria-label={t.swapLabel}
                        title={t.swapLabel}
                        disabled={!ready || busy}
                        onClick={() => {
                          setOrigin(destination);
                          setDestination(origin);
                          invalidate();
                        }}
                      >
                        <ArrowUpDown size={14} />
                      </button>
                      <StopSearch
                        label={t.toLabel}
                        value={destination}
                        disabled={!ready || busy}
                        lang={lang}
                        onChange={(s) => {
                          setDestination(s);
                          invalidate();
                        }}
                      />
                    </div>

                    <div className="datetime-row">
                      <div className="datetime-input-group">
                        <label className="datetime-label" htmlFor="raahi-dep-date">
                          <Calendar size={12} />
                          <span>{t.depDate}</span>
                        </label>
                        <input
                          id="raahi-dep-date"
                          aria-label="Departure date"
                          type="date"
                          required
                          value={date}
                          disabled={busy}
                          onChange={(e) => {
                            setDate(e.target.value);
                            invalidate();
                          }}
                        />
                      </div>
                      <div className="datetime-input-group">
                        <label className="datetime-label" htmlFor="raahi-dep-time">
                          <Clock3 size={12} />
                          <span>{t.depTime}</span>
                        </label>
                        <input
                          id="raahi-dep-time"
                          aria-label="Departure time IST"
                          type="time"
                          required
                          value={time}
                          disabled={busy}
                          onChange={(e) => {
                            setTime(e.target.value);
                            invalidate();
                          }}
                        />
                      </div>
                    </div>

                    <div className="quick-time-chips" aria-label="Quick departure options">
                      <button type="button" className="chip-btn" disabled={busy} onClick={() => applyOffsetMinutes(0)}>
                        {t.quickNow}
                      </button>
                      <button type="button" className="chip-btn" disabled={busy} onClick={() => applyOffsetMinutes(15)}>
                        {t.quickPlus15}
                      </button>
                      <button type="button" className="chip-btn" disabled={busy} onClick={() => applyOffsetMinutes(30)}>
                        {t.quickPlus30}
                      </button>
                      <button type="button" className="chip-btn" disabled={busy} onClick={() => applyOffsetMinutes(60)}>
                        {t.quickPlus60}
                      </button>
                    </div>

                    <fieldset className="preference-fieldset">
                      <legend className="preference-legend">
                        <SlidersHorizontal size={12} />
                        <span>{t.preferenceLegend}</span>
                      </legend>
                      <div className="mode-options-grid">
                        {[
                          ["fastest", t.modeFastest],
                          ["balanced", t.modeBalanced],
                          ["less_crowded", t.modeComfort],
                        ].map(([id, label]) => (
                          <button
                            type="button"
                            key={id}
                            disabled={busy}
                            aria-pressed={mode === id}
                            className={`mode-card ${mode === id ? "selected" : ""}`}
                            onClick={() => {
                              setMode(id);
                              invalidate();
                            }}
                          >
                            <span className="mode-icon" aria-hidden>{id === "fastest" ? <Zap size={23} /> : id === "balanced" ? <Scale size={23} /> : <Users size={23} />}</span>
                            <span className="mode-title">{label}</span>
                          </button>
                        ))}
                      </div>
                    </fieldset>

                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={transfers}
                        disabled={busy}
                        onChange={(e) => {
                          setTransfers(e.target.checked);
                          invalidate();
                        }}
                      />
                      <span>{t.allowTransfers}</span>
                    </label>

                    <button
                      type="submit"
                      className="raahi-btn primary full-width"
                      disabled={!ready || busy}
                    >
                      {busy ? (
                        <span className="raahi-spinner small" aria-hidden />
                      ) : (
                        <Search size={16} />
                      )}
                      <span>{busy ? t.findingJourneys : t.findJourneyBtn}</span>
                    </button>
                  </form>

                  {!ready && (
                    <div className="notice-box" role="status">
                      <Info size={17} />
                      <div>
                        <strong>{t.gtfsAwaitingTitle}</strong>
                        <p>{t.gtfsAwaitingText}</p>
                        <button
                          type="button"
                          className="link-btn"
                          onClick={() => setTab("explore")}
                        >
                          {t.exploreTicketsLink} <ChevronRight size={13} />
                        </button>
                      </div>
                    </div>
                  )}

                  {ready && (
                    <button type="button" className="demo-link-btn" onClick={loadDemo}>
                      <Sparkles size={12} />
                      <span>{t.useDemoPair}</span>
                    </button>
                  )}

                  {error && (
                    <div className="error-banner" role="alert">
                      <AlertCircle size={15} style={{ flexShrink: 0 }} />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="panel-footer-trust" aria-label="Data disclaimer">
                    <ShieldCheck size={16} style={{ flexShrink: 0 }} />
                    <div>
                      <strong>{t.realRecordsNotice}</strong>
                      <span>{t.noGuaranteesNotice}</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* ---- PANEL 2: JOURNEY LIST ---- */}
              <section className="journey-list-panel" aria-label="Journey options">
                {/* Panel Header */}
                <div className="journey-list-panel-header">
                  <div className="list-panel-heading">
                    <span className="list-panel-title">
                      {searched ? t.resultsHeading : (lang === "hi" ? "विकल्प" : "Options")}
                    </span>
                    {result?.journeys.length ? (
                      <span className="list-panel-count">{t.journeyCount(result.journeys.length)}</span>
                    ) : null}
                  </div>
                </div>

                {/* Journey Cards */}
                <div className="journey-list-scroll">
                  {busy ? (
                    <div className="empty-panel">
                      <div className="raahi-spinner" />
                      <p>{t.findingJourneys}</p>
                    </div>
                  ) : searched && result && !result.journeys.length ? (
                    <div className="empty-results-box" role="status">
                      <h3>{t.noJourneysTitle}</h3>
                      <p>{result.message || t.noJourneysHint}</p>
                    </div>
                  ) : !searched || !result ? (
                    <div className="empty-panel search-empty-state" role="status">
                      <div className="empty-panel-icon"><Route size={24} /></div>
                      <div className="empty-state-copy">
                        <h3>{origin && destination ? (lang === "hi" ? "सफ़र की तुलना के लिए तैयार" : "Ready to compare your journey") : (lang === "hi" ? "आपका बेहतर सफ़र यहाँ से शुरू होता है" : "Your better journey starts here")}</h3>
                        <p>{origin && destination ? (lang === "hi" ? "समय और अनुमानित मांग के आधार पर बस विकल्प देखें।" : "Find bus options and compare time with expected demand.") : (lang === "hi" ? "अपने स्टॉप चुनें। फिर समय, मांग और बस बदलने के विकल्प साथ देखें।" : "Choose your stops, then compare travel time, demand and transfers together.")}</p>
                      </div>
                      <button type="button" className="raahi-btn secondary empty-state-action" disabled={!ready} onClick={() => {
                        if (origin && destination) { void search(); return; }
                        const inputs = document.querySelectorAll<HTMLInputElement>(".stop-field input");
                        inputs[origin ? 1 : 0]?.focus();
                      }}>
                        {origin && destination ? (lang === "hi" ? "सफ़र की तुलना करें" : "Compare journeys") : origin ? (lang === "hi" ? "गंतव्य चुनें" : "Choose destination") : (lang === "hi" ? "शुरुआती स्टॉप चुनें" : "Choose departure stop")}
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  ) : (
                    result.journeys.map((j, i) => {
                      const isPicked = journey === j;
                      const isRecommended = i === 0;
                      const isFastest =
                        j.duration_minutes ===
                        Math.min(...result.journeys.map((item) => item.duration_minutes));
                      const depTime = timeLabel(j.legs[0].departure);
                      const arrTime = timeLabel(j.legs.at(-1)!.arrival);

                      return (
                        <button
                          key={j.id}
                          type="button"
                          className={`journey-card ${isPicked ? "picked" : ""}`}
                          onClick={() => {
                            setJourney(j);
                            setSegment(null);
                            setTimelineOpen(true);
                            if (window.innerWidth <= 860) setMobileView("map");
                          }}
                          aria-pressed={isPicked}
                        >
                          {/* Row 1: Badge + Duration + Demand */}
                          <div className="jcard-row1">
                            <div className="jcard-left">
                              <div className="jcard-badge-row">
                                {isPicked && <span className="selected-label">{lang === "hi" ? "चयनित" : "Selected"}</span>}
                                {isRecommended ? (
                                  <span className="raahi-badge recommended">
                                    <Sparkles size={10} />
                                    {t.recommendedTag}
                                  </span>
                                ) : isFastest ? (
                                  <span className="raahi-badge fastest">
                                    <Clock3 size={10} />
                                    {t.fastestTag}
                                  </span>
                                ) : (
                                  <span className="raahi-badge alt">
                                    {t.alternativeTag(i)}
                                  </span>
                                )}
                              </div>
                              <div className="jcard-duration">
                                <span className="duration-num">{j.duration_minutes}</span>
                                <span className="duration-unit">{lang === "hi" ? "मिनट" : "min"}</span>
                              </div>
                            </div>

                            {/* Demand index */}
                            <div className="jcard-demand">
                              {j.demand_index != null ? (
                                <>
                                  <span
                                    className="demand-index-block"
                                    style={{ color: crowdColor(j.demand_index) }}
                                    aria-label={`Demand index ${j.demand_index} out of 100`}
                                  >
                                    {j.demand_index}
                                  </span>
                                  <span className="demand-label-small">
                                    {t.demandIndexLabel}
                                    {j.prediction_coverage < 1 ? ` · ${t.partialLabel}` : ""}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span
                                    className="demand-index-block"
                                    style={{ color: "var(--crowd-unknown)" }}
                                    aria-label="Demand unavailable"
                                  >
                                    —
                                  </span>
                                  <span className="demand-label-small">
                                    {t.demandUnavailable}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Row 2: Times + Routes */}
                          <div className="jcard-row2">
                            <div className="jcard-times">
                              <span className="jcard-time">{depTime}</span>
                              <ArrowRight size={12} style={{ color: "var(--raahi-ink-muted)" }} />
                              <span className="jcard-time">{arrTime}</span>
                            </div>
                            <div className="jcard-routes">
                              {j.legs.map((l, k) => (
                                <span key={k} className="bus-route-pill">
                                  <BusFront size={11} />
                                  <strong>{l.route}</strong>
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Row 3: Transfer + Evidence */}
                          <div className="jcard-row3">
                            <span className="transfer-hint">
                              {j.transfers > 0 ? (
                                <>
                                  <Footprints size={11} />
                                  {t.transferAt(getStopDisplayName(j.legs[0].destination.name, lang))}
                                </>
                              ) : (
                                <>
                                  <BusFront size={11} />
                                  {t.directTrip}
                                </>
                              )}
                            </span>
                            <span className="jcard-evidence-tag">
                              {j.prediction_coverage < 1
                                ? t.partialEvidenceNotice(Math.round(j.prediction_coverage * 100))
                                : t.evidenceLabel(j.evidence)}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Departure comparison — compact section */}
                {result?.departure_comparison && result.departure_comparison.length > 0 && (
                  <details className="departure-comparison-section">
                    <summary className="departure-comparison-title">
                      {lang === "hi" ? "बाद में जाएं?" : "Later departure?"}
                    </summary>
                    <div className="departure-options">
                      {result.departure_comparison.map((c) => (
                        <button
                          key={c.offset_minutes}
                          type="button"
                          disabled={!c.journey}
                          aria-pressed={journey === c.journey}
                          className={`departure-chip ${journey === c.journey ? "active-dep" : ""}`}
                          onClick={() => {
                            setJourney(c.journey);
                            setSegment(null);
                            setTimelineOpen(true);
                            setMobileView("map");
                          }}
                        >
                          <strong>
                            {c.offset_minutes ? t.plusMinOffset(c.offset_minutes) : t.selectedTimeTag}
                          </strong>
                          <span>
                            {c.journey
                              ? t.durationMinutes(c.journey.duration_minutes)
                              : t.noServiceThisTime}
                          </span>
                          {c.journey && (
                            <>
                              <span className="departure-clock">{timeLabel(c.journey.legs[0].departure)} → {timeLabel(c.journey.legs.at(-1)!.arrival)}</span>
                              <small>{t.totalMinutes(Math.round((Date.parse(c.journey.legs.at(-1)!.arrival) - Date.parse(`${date}T${time}:00+05:30`)) / 60000))}</small>
                            </>
                          )}
                          <small
                            style={{
                              color:
                                c.journey?.demand_index != null
                                  ? crowdColor(c.journey.demand_index)
                                  : undefined,
                            }}
                          >
                            {c.journey?.demand_index != null
                              ? `${t.indexLabel} ${c.journey.demand_index}`
                              : t.demandUnavailable}
                          </small>
                        </button>
                      ))}
                    </div>
                    <small className="departure-disclaimer">{t.laterDepartureDisclaimer}</small>
                  </details>
                )}
              </section>

              {/* ---- PANEL 3: MAP + JOURNEY DETAIL ---- */}
              <section
                className={`map-detail-panel ${journey ? "has-journey" : ""}`}
                aria-label="Journey map and details"
              >
                {/* Map */}
                <div className="map-container-box">
                  <Suspense fallback={<div className="map-loading" style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--raahi-ink-muted)" }}>Loading Delhi map…</div>}>
                    <JourneyMap
                      journey={journey}
                      activeSegment={segment}
                      onSegment={setSegment}
                      lang={lang}
                    />
                  </Suspense>

                  <div className="map-floating-top">
                    <span className="map-title-chip">
                      <MapPin size={13} />
                      {t.mapTitle}
                    </span>
                    <span className="map-badge-chip">
                      {ready ? t.mapScheduleMode : t.mapNetworkPending}
                    </span>
                  </div>

                  {!journey && (
                    <div className="map-welcome-card" role="status">
                      <div className="welcome-icon">
                        <BusFront size={22} />
                      </div>
                      <h2>{busy ? t.findingJourneys : searched && result && !result.journeys.length ? (lang === "hi" ? "दिखाने के लिए कोई रूट नहीं" : "No route to display") : t.mapEmptyHeading}</h2>
                      <p>
                        {searched && result && !result.journeys.length ? t.noJourneysHint : ready
                          ? origin && destination
                            ? t.mapEmptyReady
                            : t.mapEmptyPrompt
                          : "The map is ready. Route overlays appear after the GTFS network is verified."}
                      </p>

                    </div>
                  )}

                  {journey && <div className="map-floating-legend" aria-label="Demand legend">
                    <span className="legend-label">{t.mapLegendTitle}</span>
                    <div className="legend-items">
                      {[
                        [crowdColor(0), t.mapLegendLower],
                        [crowdColor(50), t.mapLegendTypical],
                        [crowdColor(75), t.mapLegendHigher],
                        [crowdColor(100), t.mapLegendHighest],
                        [crowdColor(null), t.mapLegendUnknown],
                      ].map(([c, l]) => (
                        <span key={l} className="legend-swatch">
                          <i style={{ background: c }} aria-hidden />
                          {l}
                        </span>
                      ))}
                    </div>
                  </div>}
                </div>

                {/* Journey Detail Panel */}
                {journey && (
                  <div className="journey-detail-panel">
                    <div className="journey-detail">
                      <div className="selected-journey-heading"><BusFront size={21} /><h2>{lang === "hi" ? "चयनित सफ़र" : "Selected journey"}</h2></div>
                      <div className="selected-journey-summary">
                        <strong>{t.durationMinutes(journey.duration_minutes)}</strong>
                        <span style={{color: crowdColor(journey.demand_index)}}>{journey.demand_index == null ? t.demandUnavailable : `${t.demandIndexLabel} ${journey.demand_index}/100`}</span>
                        <small>{journey.prediction_coverage < 1 ? t.partialEvidenceNotice(Math.round(journey.prediction_coverage * 100)) : t.evidenceLabel(journey.evidence)}</small>
                      </div>
                      {journey.duration_minutes > Math.round((Date.parse(journey.legs.at(-1)!.arrival) - Date.parse(journey.legs[0].departure)) / 60000) && <p className="initial-wait-note">{lang === "hi" ? "पहली बस से पहले प्रतीक्षा शामिल है: " : "Includes waiting before the first bus: "}{t.durationMinutes(journey.duration_minutes - Math.round((Date.parse(journey.legs.at(-1)!.arrival) - Date.parse(journey.legs[0].departure)) / 60000))}</p>}
                      {/* Header: Origin → Destination with times */}
                      <div className="jd-header">
                        <div className="jd-route-visual" aria-hidden>
                          <div className="jd-origin-dot" />
                          <div className="jd-route-line" />
                          <div className="jd-dest-dot" />
                        </div>
                        <div className="jd-stops">
                          <div className="jd-origin-name">
                            {getStopDisplayName(journey.legs[0].origin.name, lang)}
                          </div>
                          <div className="jd-dest-name">
                            {getStopDisplayName(journey.legs.at(-1)!.destination.name, lang)}
                          </div>
                        </div>
                      </div>

                      {/* Times row */}
                      <div className="jd-time-row" aria-label="Journey times">
                        <div className="jd-time-block">
                          <span className="jd-time-val">{timeLabel(journey.legs[0].departure)}</span>
                          <span className="jd-time-label">{lang === "hi" ? "प्रस्थान" : "Depart"}</span>
                        </div>
                        <div className="jd-time-arrow">
                          <div className="jd-duration-pill">{t.durationMinutes(journey.duration_minutes)}</div>
                          <div className="jd-time-line" />
                        </div>
                        <div className="jd-time-block">
                          <span className="jd-time-val">{timeLabel(journey.legs.at(-1)!.arrival)}</span>
                          <span className="jd-time-label">{lang === "hi" ? "आगमन" : "Arrive"}</span>
                        </div>
                      </div>

                      {/* ===== THE SIGNATURE EXPERIENCE: TRADEOFF HERO ===== */}
                      {journey.comparison && <TradeoffHero journey={journey} lang={lang} />}
                      <p className="result-demand-note">{lang === "hi" ? "ऐतिहासिक टिकट डेटा से अनुमानित, लाइव यात्री संख्या नहीं।" : "Estimated from historical ticket data, not live occupancy."}</p>

                      {/* Segment Demand Strip */}
                      <div className="segments-section">
                        <div className="segments-label" id="segments-label">
                          {lang === "hi" ? "खंड-स्तर मांग" : "Segment demand"}
                        </div>
                        <div
                          className="segments-strip"
                          aria-labelledby="segments-label"
                          role="group"
                          aria-label="Click a segment to inspect its demand data"
                        >
                          {journey.legs
                            .flatMap((l) => l.segments)
                            .map((s, i) => (
                              <button
                                type="button"
                                title={`${s.start.name} → ${s.end.name}: ${s.prediction.category}`}
                                key={s.id + i}
                                aria-label={t.inspectSegmentBtn(s.start.name, s.end.name)}
                                className={`strip-segment ${segment === s ? "active-strip" : ""}`}
                                style={{ background: crowdColor(s.prediction.index) }}
                                onClick={() => setSegment(segment === s ? null : s)}
                              />
                            ))}
                        </div>

                        {segment && (
                          <div className="segment-info" role="status">
                            <div className="segment-info-header">
                              <strong>
                                {getStopDisplayName(segment.start.name, lang)} →{" "}
                                {getStopDisplayName(segment.end.name, lang)}
                              </strong>
                              <span
                                className="segment-cat-badge"
                                style={{ background: crowdColor(segment.prediction.index) }}
                              >
                                {segment.prediction.index == null ? t.demandUnavailable : segment.prediction.index <= 25 ? t.demandLow : segment.prediction.index <= 50 ? t.demandTypical : segment.prediction.index <= 75 ? t.demandHigher : t.demandHighest}
                              </span>
                            </div>
                            <p>
                              {segment.prediction.index != null
                                ? t.demandScore(segment.prediction.index)
                                : t.demandUnavailable}{" "}
                              · {t.evidenceLabel(segment.prediction.evidence)} ·{" "}
                              {t.observedDays(segment.prediction.observed_days)}
                            </p>
                            <small>
                              {t.ticketRecordsSupport(pretty(segment.prediction.tickets))}{" "}
                              {t.historicalRangeDesc}
                            </small>
                          </div>
                        )}
                      </div>

                      {/* ===== JOURNEY TIMELINE ===== */}
                      <div className="timeline-section">
                        <button
                          type="button"
                          className="timeline-toggle"
                          onClick={() => setTimelineOpen(!timelineOpen)}
                          aria-expanded={timelineOpen}
                        >
                          <span>{t.stopsAndSchedules}</span>
                          {timelineOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>

                        {timelineOpen && (
                          <div className="timeline-body">
                            {journey.legs.map((l, k) => {
                              const isExpanded = !!expandedStops[`leg-${k}`];
                              const intermediateStops = l.segments.map((s) => s.end).slice(0, -1);

                              return (
                                <div key={k}>
                                  {/* Transfer connector between legs */}
                                  {k > 0 && (
                                    <div className="transfer-connector">
                                      <div className="transfer-icon-circle" aria-hidden>
                                        <Footprints size={12} />
                                      </div>
                                      <div>
                                        <div className="transfer-connector-text">
                                          {lang === "hi" ? "यहाँ बस बदलें" : "Change bus here"}
                                        </div>
                                        <div className="transfer-connector-sub">
                                          {t.transferWindow} · {t.durationMinutes(Math.max(0, Math.round((Date.parse(l.departure) - Date.parse(journey.legs[k - 1].arrival)) / 60000)))} ·{" "}
                                          {getStopDisplayName(l.origin.name, lang)}
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  <div className="transit-leg-block">
                                    <div className="leg-route-header">
                                      <BusFront size={14} />
                                      <strong>{l.route}</strong>
                                      <span style={{ opacity: 0.7, fontWeight: 400 }}>
                                        · {timeLabel(l.departure)} – {timeLabel(l.arrival)}
                                      </span>
                                    </div>

                                    <div className="timeline-stepper">
                                      {/* Board */}
                                      <div className="stepper-stop start">
                                        <div className="step-icon-node start-node" aria-hidden />
                                        <div className="step-content">
                                          <div className="step-time">{timeLabel(l.departure)}</div>
                                          <div className="step-name">
                                            {getStopDisplayName(l.origin.name, lang)}
                                          </div>
                                          <small className="step-hint">
                                            {lang === "hi" ? "यहाँ बस पकड़ें" : "Board here"}
                                          </small>
                                        </div>
                                      </div>

                                      {/* Intermediate stops accordion */}
                                      {intermediateStops.length > 0 && (
                                        <div className="intermediate-stops-box">
                                          <button
                                            type="button"
                                            className="intermediate-toggle-btn"
                                            onClick={() =>
                                              setExpandedStops((prev) => ({
                                                ...prev,
                                                [`leg-${k}`]: !prev[`leg-${k}`],
                                              }))
                                            }
                                            aria-expanded={isExpanded}
                                          >
                                            <span>
                                              {t.intermediateStopsCount(intermediateStops.length)}
                                            </span>
                                            {isExpanded ? (
                                              <ChevronUp size={13} />
                                            ) : (
                                              <ChevronDown size={13} />
                                            )}
                                          </button>
                                          {isExpanded && (
                                            <ol className="intermediate-list">
                                              {l.segments.slice(0, -1).map((s, idx) => (
                                                <li key={`${s.id}-${idx}`} className="intermediate-item">
                                                  <span className="intermediate-dot" aria-hidden />
                                                  <span style={{ flex: 1 }}>
                                                    {getStopDisplayName(s.end.name, lang)}
                                                  </span>
                                                  <span
                                                    className="intermediate-demand-tag"
                                                    style={{ color: crowdColor(s.prediction.index) }}
                                                  >
                                                    {s.prediction.index != null
                                                      ? `${s.prediction.index}`
                                                      : "—"}
                                                  </span>
                                                </li>
                                              ))}
                                            </ol>
                                          )}
                                        </div>
                                      )}

                                      {/* Alight */}
                                      <div className="stepper-stop end">
                                        <div className="step-icon-node end-node" aria-hidden />
                                        <div className="step-content">
                                          <div className="step-time">{timeLabel(l.arrival)}</div>
                                          <div className="step-name">
                                            {getStopDisplayName(l.destination.name, lang)}
                                          </div>
                                          <small className="step-hint">
                                            {k < journey.legs.length - 1
                                              ? t.transferWindow
                                              : lang === "hi"
                                              ? "गंतव्य पर उतरें"
                                              : "Alight here"}
                                          </small>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <p className="timing-geometry-basis">
                          {t.detailNote}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </main>
          )}

          {/* ============================================================== */}
          {/* TAB 2: DEMAND EXPLORER                                         */}
          {/* ============================================================== */}
          {tab === "explore" && (
            <main className="content-page explorer-page" style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
              <div className="page-heading">
                <div>
                  <h1>{t.explorerTitle}</h1>
                  <p>{t.explorerSubtitle}</p>
                </div>
                <span className="outline-tag">{t.explorerDateTag}</span>
              </div>



              <section className="chart-card">
                <div className="chart-heading">
                  <div>
                    <h2>{t.chartTitleHourly}</h2>
                    <p>{t.chartDescHourly}</p>
                  </div>
                  <div className="chart-controls">
                    <label>
                      {t.routeSelectLabel}
                      <select
                        aria-label="Historical route"
                        value={route}
                        onChange={(e) => setRoute(e.target.value)}
                      >
                        {quality?.top_routes.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} ({pretty(r.tickets)} tickets)
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {t.travelDateLabel}
                      <input
                        type="date"
                        aria-label="Historical profile date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                      />
                    </label>
                  </div>
                </div>

                {profileLoading ? (
                  <div className="chart-placeholder" role="status">
                    <div className="raahi-spinner small" />
                    <span>{t.calculatingProfile}</span>
                  </div>
                ) : profileError ? (
                  <div className="chart-placeholder error" role="alert">
                    <AlertCircle size={18} />
                    <span>{profileError}</span>
                  </div>
                ) : (
                  profile && (
                    <>
                      <div>
                        <ResponsiveContainer width="100%" height={280}>
                          <AreaChart
                            data={profile.points}
                            margin={{ top: 12, right: 16, left: 0, bottom: 5 }}
                          >
                            <defs>
                              <linearGradient id="demandFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#134e48" stopOpacity={0.35} />
                                <stop offset="95%" stopColor="#134e48" stopOpacity={0.0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} stroke="#e3e3d8" strokeDasharray="3 3" />
                            <XAxis
                              dataKey="time"
                              interval={Math.max(1, Math.floor(profile.points.length / 8) - 1)}
                              tickLine={false}
                              axisLine={false}
                              tick={{ fontSize: 11 }}
                            />
                            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                            <Tooltip
                              formatter={(v) => [Number(v).toFixed(1), t.chartTooltipUnit]}
                            />
                            <Area
                              isAnimationActive={false}
                              type="monotone"
                              dataKey="expected"
                              stroke="#134e48"
                              fill="url(#demandFill)"
                              strokeWidth={2.5}
                              connectNulls={false}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="chart-note">
                        <Info size={16} />
                        <span>
                          {t.chartNoteText(profile.bin_minutes, profile.historical_through)}
                        </span>
                      </div>

                      <div className="hour-table">
                        <h3>{t.inspectEvidenceTable}</h3>
                        <div className="table-scroll">
                          <table>
                            <thead>
                              <tr>
                                <th>{t.tableColTime}</th>
                                <th>{t.tableColExpected}</th>
                                <th>{t.tableColIndex}</th>
                                <th>{t.tableColDays}</th>
                                <th>{t.tableColEvidence}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {profile.points
                                .filter((p) => p.time >= "06:00" && p.time <= "22:00")
                                .map((p) => (
                                  <tr key={p.time}>
                                    <td>
                                      <strong>{p.time}</strong>
                                    </td>
                                    <td>{p.expected?.toFixed(1) ?? "—"}</td>
                                    <td>
                                      <span
                                        className="index-value-pill"
                                        style={{
                                          color: crowdColor(p.index),
                                          borderColor: crowdColor(p.index),
                                        }}
                                      >
                                        {p.index == null ? "Unavailable" : `${p.index}/100`}
                                      </span>
                                    </td>
                                    <td>{p.observed_days}</td>
                                    <td>
                                      <span className={`badge ${p.evidence}`}>{t.evidenceLabel(p.evidence)}</span>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )
                )}
              </section>

              <div className="insight-grid">
                <section className="chart-card">
                  <h2>{t.dailyPatternTitle}</h2>
                  <p>{t.dailyPatternDesc}</p>
                  <div style={{ marginTop: 16 }}>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={quality?.hourly}>
                        <CartesianGrid vertical={false} stroke="#e3e3d8" strokeDasharray="3 3" />
                        <XAxis
                          dataKey="hour"
                          tickFormatter={(v) => `${v}:00`}
                          interval={3}
                          tickLine={false}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis
                          width={60}
                          tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip />
                        <Bar
                          isAnimationActive={false}
                          dataKey="passengers"
                          fill="#b84226"
                          radius={[3, 3, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                <section className="insight-copy">
                  <div className="insight-icon-box">
                    <ShieldCheck size={30} />
                  </div>
                  <h2>
                    {t.insightHeading1}
                  </h2>
                  <p>{t.insightP1}</p>
                  <p>{t.insightP2}</p>
                  <button
                    type="button"
                    className="raahi-btn secondary"
                    onClick={() => setTab("evidence")}
                  >
                    {t.inspectMethodologyBtn} <ChevronRight size={15} />
                  </button>
                </section>
              </div>
            </main>
          )}

          {/* ============================================================== */}
          {/* TAB 3: EVIDENCE                                                 */}
          {/* ============================================================== */}
          {tab === "evidence" && (
            <main className="content-page evidence-page" style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
              <div className="page-heading">
                <div>
                  <h1>{t.evidenceTitle}</h1>
                  <p>{t.evidenceSubtitle}</p>
                </div>
                <div className="evidence-badge-icon">
                  <ShieldCheck size={40} color="#134e48" />
                </div>
              </div>

              <div className="metrics-grid">
                <Stat label={t.statHistoryThrough} value={quality?.coverage?.last_date || "Unavailable"} />
                <Stat label={t.statValidRecords} value={pretty(quality?.valid_records)} />
                <Stat label={t.statSampledPassengers} value={pretty(quality?.coverage?.sampled_passengers)} />
                <Stat label={t.statRouteLabels} value={pretty(quality?.coverage?.routes)} />
                <Stat label={t.statDaysObserved} value={pretty(quality?.coverage?.dates)} />
                <Stat label={t.statDuplicateSurplus} value={pretty(quality?.exact_duplicate_surplus)} />
                <Stat
                  label={t.statMatchingCoverage}
                  value={
                    overview.network.matching_coverage == null
                      ? "Not available"
                      : `${(overview.network.matching_coverage * 100).toFixed(1)}%`
                  }
                />
                <Stat
                  label={t.statPatternsModeled}
                  value={`${pretty(overview.network.modeled_patterns)} / ${pretty(overview.network.patterns)}`}
                />
                <Stat
                  label={t.statTicketsModeledDirectly}
                  value={
                    overview.network.modeled_ticket_share == null
                      ? "Unavailable"
                      : `${(overview.network.modeled_ticket_share * 100).toFixed(1)}%`
                  }
                />
              </div>

              <section className="chart-card">
                <h2>{t.rankingTitle}</h2>
                <p>{t.rankingDetails}</p>
                <p className="evidence-footnote">{t.coverageExplanation}</p>
              </section>

              <section className="chart-card">
                <h2>{t.valSectionTitle}</h2>
                <p>{t.valSectionDesc}</p>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>{t.tableColWindow}</th>
                        <th>{t.tableColModel}</th>
                        <th>{t.tableColMae}</th>
                        <th>{t.tableColWape}</th>
                        <th>{t.tableColRank}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.validation.variants?.flatMap((v) => [
                        <tr key={`${v.minutes}-base`}>
                          <td>{v.minutes} min</td>
                          <td>{t.modelHistAvg}</td>
                          <td>{v.baseline.mae}</td>
                          <td>{(v.baseline.wape * 100).toFixed(1)}%</td>
                          <td>{v.baseline.rank_correlation ?? "—"}</td>
                        </tr>,
                        <tr key={`${v.minutes}-model`}>
                          <td>{v.minutes} min</td>
                          <td>
                            {t.modelDayProfile}{" "}
                            {v.minutes === overview.validation.selected_minutes && (
                              <span className="badge moderate">{t.badgeSelected}</span>
                            )}
                          </td>
                          <td>{v.seasonal.mae}</td>
                          <td>{(v.seasonal.wape * 100).toFixed(1)}%</td>
                          <td>{v.seasonal.rank_correlation ?? "—"}</td>
                        </tr>,
                      ])}
                    </tbody>
                  </table>
                </div>
                <div className="chart-note">
                  <Info size={16} />
                  <span>{t.maeNote}</span>
                </div>
              </section>

              {overview.segment_validation && (
                <section className="chart-card">
                  <h2>{t.segmentValTitle}</h2>
                  <p>{t.segmentValDesc(overview.network.modeled_patterns ?? 100)}</p>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>{t.tableColModel}</th>
                          <th>{t.tableColMae}</th>
                          <th>{t.tableColWape}</th>
                          <th>{t.tableColRank}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(["baseline", "same_slot", "seasonal"] as const).map((name) => {
                          const metric = overview.segment_validation![name];
                          return (
                            <tr key={name}>
                              <td>
                                <strong>
                                  {name === "baseline"
                                    ? t.modelSegAvg
                                    : name === "same_slot"
                                    ? t.modelSameSlot
                                    : t.modelSeasonal}
                                </strong>
                              </td>
                              <td>{metric.mae}</td>
                              <td>
                                {metric.wape == null
                                  ? "Unavailable"
                                  : `${(metric.wape * 100).toFixed(1)}%`}
                              </td>
                              <td>{metric.rank_correlation ?? "Unavailable"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="evidence-footnote">{t.trainValPeriod}</p>
                </section>
              )}

              {overview.model_audit && (
                <section className="chart-card">
                  <h2>{t.strongerComparisonTitle}</h2>
                  <p>{t.strongerComparisonDesc}</p>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>{t.tableColSegVal}</th>
                          <th>{t.tableColSameSlotWape}</th>
                          <th>{t.tableColSeasonalWape}</th>
                          <th>{t.tableColSameSlotOrder}</th>
                          <th>{t.tableColSeasonalOrder}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview.model_audit.segment.map((v, i) => (
                          <tr key={i}>
                            <td>
                              <strong>{i === 0 ? "15–21 October" : "24–31 October"}</strong>
                            </td>
                            <td>{(v.metrics.same_slot.wape * 100).toFixed(1)}%</td>
                            <td>{(v.metrics.seasonal.wape * 100).toFixed(1)}%</td>
                            <td>
                              {(
                                v.within_key_departure_ranking.same_slot
                                  .accuracy_with_half_credit_for_prediction_ties * 100
                              ).toFixed(1)}
                              %
                            </td>
                            <td>
                              {(
                                v.within_key_departure_ranking.seasonal
                                  .accuracy_with_half_credit_for_prediction_ties * 100
                              ).toFixed(1)}
                              %
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="evidence-footnote">{t.modelAuditFooter}</p>
                </section>
              )}

              <div className="insight-grid">
                <section className="chart-card">
                  <h2>{t.howSignalWorksTitle}</h2>
                  <ol className="method-list">
                    <li>
                      <strong>{t.step1Title}</strong>
                      <p>{t.step1Desc}</p>
                    </li>
                    <li>
                      <strong>{t.step2Title}</strong>
                      <p>{t.step2Desc}</p>
                    </li>
                    <li>
                      <strong>{t.step3Title}</strong>
                      <p>{t.step3Desc}</p>
                    </li>
                    <li>
                      <strong>{t.step4Title}</strong>
                      <p>{t.step4Desc}</p>
                    </li>
                  </ol>
                </section>

                <section className="chart-card boundaries-card">
                  <h2>{t.dataBoundariesTitle}</h2>
                  <ul className="limitations-list">
                    <li>
                      <AlertCircle size={15} />
                      <span>{t.limit1}</span>
                    </li>
                    <li>
                      <Clock3 size={15} />
                      <span>{t.limit2}</span>
                    </li>
                    <li>
                      <Layers size={15} />
                      <span>{t.limit3}</span>
                    </li>
                    <li>
                      <Info size={15} />
                      <span>{t.limit4}</span>
                    </li>
                  </ul>
                </section>
              </div>
            </main>
          )}
        </>
      )}
    </div>
  );
}

/**
 * THE SIGNATURE INNOVATION: Tradeoff Hero
 * Visual comparison of time vs demand between selected journey and fastest option.
 */
function TradeoffHero({ journey, lang = "en" }: { journey: Journey; lang?: Language }) {
  const c = journey.comparison;
  if (!c) return null;
  const t = translations[lang] || translations.en;

  const refMin = c.reference_minutes;
  const maxMin = Math.max(refMin, journey.duration_minutes);
  const refTimeWidth = maxMin > 0 ? (refMin / maxMin) * 100 : 50;
  const selTimeWidth = maxMin > 0 ? (journey.duration_minutes / maxMin) * 100 : 60;

  const refIdx = c.reference_index;
  const selIdx = journey.demand_index;
  const maxIdx = Math.max(refIdx ?? 0, selIdx ?? 0, 1);
  const refDemandWidth = maxIdx > 0 && refIdx != null ? (refIdx / maxIdx) * 100 : 50;
  const selDemandWidth = maxIdx > 0 && selIdx != null ? (selIdx / maxIdx) * 100 : 50;

  const hasComparison = c.status !== "unavailable" && refIdx != null && selIdx != null;

  return (
    <div className="tradeoff-hero" role="region" aria-label={t.tradeoffEyebrow}>
      <div className="tradeoff-hero-header">
        <Sparkles size={13} style={{ color: "#92400e", flexShrink: 0 }} />
        <span className="tradeoff-hero-eyebrow">{t.tradeoffEyebrow}</span>
        {c.status === "limited" && (
          <span className="tradeoff-status-badge">{t.tradeoffLimitedBadge}</span>
        )}
      </div>

      <details className="comparison-details"><summary>{lang === "hi" ? "समय और मांग की तुलना" : "Compare time and demand"}</summary>
      {hasComparison ? (
        <div className="tradeoff-comparison">
          {/* Column headers */}
          <div className="tradeoff-col-labels">
            <span className="tradeoff-col-label left-align"></span>
            <span className="tradeoff-col-label">
              {lang === "hi" ? "सबसे तेज़" : "Fastest"}
            </span>
            <span className="tradeoff-col-label">
              {lang === "hi" ? "चुना गया" : "Selected"}
            </span>
          </div>

          {/* Time comparison row */}
          <div className="tradeoff-row">
            <span className="tradeoff-row-label">
              {lang === "hi" ? "समय" : "Time"}
            </span>
            <div className="tradeoff-bar-cell">
              <div className="tradeoff-bar-wrap">
                <div
                  className="tradeoff-bar-fill time-bar"
                  style={{ width: `${refTimeWidth}%` }}
                />
              </div>
              <div className="tradeoff-bar-value">
                <span style={{ color: "var(--raahi-teal)" }}>{t.durationMinutes(refMin)}</span>
              </div>
            </div>
            <div className="tradeoff-bar-cell">
              <div className="tradeoff-bar-wrap">
                <div
                  className="tradeoff-bar-fill time-bar"
                  style={{
                    width: `${selTimeWidth}%`,
                    background:
                      journey.duration_minutes > refMin
                        ? "var(--raahi-amber)"
                        : "var(--raahi-teal)",
                  }}
                />
              </div>
              <div className="tradeoff-bar-value">
                <span
                  style={{
                    color:
                      journey.duration_minutes > refMin
                        ? "var(--raahi-amber)"
                        : "var(--raahi-teal)",
                  }}
                >
                  {t.durationMinutes(journey.duration_minutes)}
                </span>
                {c.extra_minutes > 0 && (
                  <span className="tradeoff-bar-sub">{t.plusMinOffset(c.extra_minutes)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Demand comparison row */}
          <div className="tradeoff-row">
            <span className="tradeoff-row-label">
              {lang === "hi" ? "मांग" : "Demand"}
            </span>
            <div className="tradeoff-bar-cell">
              <div className="tradeoff-bar-wrap">
                <div
                  className="tradeoff-bar-fill demand-bar"
                  style={{
                    width: `${refDemandWidth}%`,
                    background: crowdColor(refIdx),
                  }}
                />
              </div>
              <div className="tradeoff-bar-value">
                <span style={{ color: crowdColor(refIdx) }}>{refIdx}</span>
                <span className="tradeoff-bar-sub">/100</span>
              </div>
            </div>
            <div className="tradeoff-bar-cell">
              <div className="tradeoff-bar-wrap">
                <div
                  className="tradeoff-bar-fill demand-bar"
                  style={{
                    width: `${selDemandWidth}%`,
                    background: crowdColor(selIdx),
                  }}
                />
              </div>
              <div className="tradeoff-bar-value">
                <span style={{ color: crowdColor(selIdx) }}>{selIdx}</span>
                <span className="tradeoff-bar-sub">/100</span>
                {c.index_points_lower != null && c.index_points_lower > 0 && (
                  <span className="tradeoff-bar-sub" style={{ color: "var(--crowd-low)" }}>
                    −{c.index_points_lower} {t.pointsUnit}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="tradeoff-unavailable">
          <Info size={15} />
          <span>{t.tradeoffUnavailable}</span>
        </div>
      )}

      </details>
      <div className="tradeoff-verdict">
        {hasComparison && <p className="tradeoff-verdict-text">
          {c.status === "unavailable"
            ? t.tradeoffUnavailable
            : c.index_points_lower != null && c.index_points_lower > 0
            ? t.tradeoffSummary(c.extra_minutes, c.index_points_lower)
            : c.extra_minutes === 0
            ? (lang === "hi" ? "समान यात्रा समय।" : "Same journey time.")
            : t.tradeoffNoAdvantage}
        </p>}
        {c.status === "limited" && <p className="tradeoff-disclaimer">{t.tradeoffLimitedBadge}</p>}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
