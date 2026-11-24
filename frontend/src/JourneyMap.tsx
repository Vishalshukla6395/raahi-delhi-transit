import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Maximize } from "lucide-react";
import { type Journey, type Segment, crowdColor } from "./api";
import { type Language, translations, getStopDisplayName } from "./i18n";
import "leaflet/dist/leaflet.css";

export function JourneyMap({
  journey,
  activeSegment = null,
  onSegment,
  lang = "en",
}: {
  journey: Journey | null;
  activeSegment?: Segment | null;
  onSegment: (s: Segment) => void;
  lang?: Language;
}) {
  const [tileError, setTileError] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const routeLayer = useRef<L.LayerGroup | null>(null);
  const highlightLayer = useRef<L.LayerGroup | null>(null);
  const markersLayer = useRef<L.LayerGroup | null>(null);
  const fitRoute = useRef<(() => void) | null>(null);
  const callback = useRef(onSegment);
  callback.current = onSegment;
  const t = translations[lang] || translations.en;

  useEffect(() => {
    if (!container.current) return;

    // Initialize Leaflet Map centered on Delhi
    const m = L.map(container.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([28.585, 77.225], 12);
    map.current = m;

    // OpenStreetMap Carto tiles
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | RAAHI Delhi',
    })
      .on("tileerror", () => setTileError(true))
      .addTo(m);

    routeLayer.current = L.layerGroup().addTo(m);
    highlightLayer.current = L.layerGroup().addTo(m);
    markersLayer.current = L.layerGroup().addTo(m);

    const observer = new ResizeObserver(() => {
      m.invalidateSize({pan: false});
      fitRoute.current?.();
    });
    observer.observe(container.current);

    return () => {
      observer.disconnect();
      m.remove();
      map.current = null;
      routeLayer.current = null;
      highlightLayer.current = null;
      markersLayer.current = null;
    };
  }, []);

  // Update Journey Polyline & Markers
  useEffect(() => {
    const m = map.current;
    const routes = routeLayer.current;
    const markers = markersLayer.current;
    if (!m || !routes || !markers) return;

    routes.clearLayers();
    markers.clearLayers();

    fitRoute.current = null;
    if (!journey) {
      m.setView([28.585, 77.225], 11);
      return;
    }

    const segments = journey.legs.flatMap((l) => l.segments);
    if (!segments.length) return;

    const points: L.LatLngTuple[] = [];

    // Draw route background casing (for crisp contrast against map tiles)
    segments.forEach((s) => {
      const a: L.LatLngTuple = [s.start.lat, s.start.lon];
      const b: L.LatLngTuple = [s.end.lat, s.end.lon];
      points.push(a, b);

      // Casing line (non-interactive background casing for contrast)
      L.polyline([a, b], {
        color: "#ffffff",
        weight: 9,
        opacity: 0.9,
        interactive: false,
      }).addTo(routes);

      // Colored demand line
      const color = crowdColor(s.prediction.index);
      const line = L.polyline([a, b], {
        color: color,
        weight: 6,
        opacity: 0.95,
        lineCap: "round",
        lineJoin: "round",
      })
        .on("click", () => callback.current(s))
        .addTo(routes);

      const index = s.prediction.index;
      const categoryText = index == null ? t.demandUnavailable : index <= 25 ? t.demandLow : index <= 50 ? t.demandTypical : index <= 75 ? t.demandHigher : t.demandHighest;

      const tooltipContent = `
        <div class="map-tooltip">
          <strong>${getStopDisplayName(s.start.name, lang)} → ${getStopDisplayName(s.end.name, lang)}</strong>
          <div style="margin-top: 4px; display: flex; align-items: center; gap: 6px;">
            <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${color};"></span>
            <span>${categoryText} (${s.prediction.index != null ? `${s.prediction.index}/100` : "N/A"})</span>
          </div>
          <small style="color: #64748b;">${t.durationMinutes(s.minutes)} · ${lang === "hi" ? "विवरण देखें" : "View details"}</small>
        </div>
      `;
      line.bindTooltip(tooltipContent, { sticky: true, opacity: 0.95 });
    });

    // Custom Origin Marker (Terracotta / Green pin)
    const startStop = segments[0].start;
    const originIcon = L.divIcon({
      className: "raahi-map-marker marker-origin",
      html: `
        <div class="marker-pin marker-pin-origin" title="${startStop.name}">
          <span>A</span>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    L.marker([startStop.lat, startStop.lon], { icon: originIcon })
      .bindPopup(`<strong>${t.fromLabel}:</strong> ${getStopDisplayName(startStop.name, lang)}`)
      .addTo(markers);

    // Intermediate stops (small clean circular bullets)
    segments.forEach((s, i) => {
      if (i > 0) {
        L.circleMarker([s.start.lat, s.start.lon], {
          radius: 4,
          color: "#0f3d38",
          fillColor: "#ffffff",
          fillOpacity: 1,
          weight: 2,
        })
          .bindPopup(`<strong>${getStopDisplayName(s.start.name, lang)}</strong>`)
          .addTo(markers);
      }
    });

    // Transfer stops (if multimodal / transfers > 0)
    journey.legs.forEach((l, idx) => {
      if (idx > 0) {
        const transferStop = l.origin;
        const transferIcon = L.divIcon({
          className: "raahi-map-marker marker-transfer",
          html: `
            <div class="marker-pin marker-pin-transfer" title="Transfer: ${transferStop.name}">
              <span>⇄</span>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });
        L.marker([transferStop.lat, transferStop.lon], { icon: transferIcon })
          .bindPopup(`<strong>${t.transferWindow}:</strong> ${getStopDisplayName(transferStop.name, lang)}`)
          .addTo(markers);
      }
    });

    // Custom Destination Marker (Crimson / Red pin)
    const endStop = segments.at(-1)!.end;
    const destIcon = L.divIcon({
      className: "raahi-map-marker marker-dest",
      html: `
        <div class="marker-pin marker-pin-dest" title="${endStop.name}">
          <span>B</span>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    L.marker([endStop.lat, endStop.lon], { icon: destIcon })
      .bindPopup(`<strong>${t.toLabel}:</strong> ${getStopDisplayName(endStop.name, lang)}`)
      .addTo(markers);

    // Smoothly fit bounds
    if (points.length) {
      fitRoute.current = () => m.stop().fitBounds(points, {
        paddingTopLeft: [65, 80],
        paddingBottomRight: [40, 95],
        maxZoom: 14,
        animate: false,
      });
      m.invalidateSize({pan: false});
      fitRoute.current();
    }
  }, [journey, lang, t]);

  // Synchronize Active Segment Highlight
  useEffect(() => {
    const highlights = highlightLayer.current;
    if (!highlights) return;

    highlights.clearLayers();
    if (!activeSegment) return;

    const a: L.LatLngTuple = [activeSegment.start.lat, activeSegment.start.lon];
    const b: L.LatLngTuple = [activeSegment.end.lat, activeSegment.end.lon];

    // Pulsing halo highlight (non-interactive visual overlay)
    L.polyline([a, b], {
      color: "#b84226",
      weight: 12,
      opacity: 0.5,
      lineCap: "round",
      interactive: false,
    }).addTo(highlights);

    L.polyline([a, b], {
      color: "#ffffff",
      weight: 8,
      opacity: 0.9,
      interactive: false,
    }).addTo(highlights);

    L.polyline([a, b], {
      color: crowdColor(activeSegment.prediction.index),
      weight: 5,
      opacity: 1,
      interactive: false,
    }).addTo(highlights);
  }, [activeSegment]);

  return (
    <div className="map-wrapper" style={{ position: "relative", width: "100%", height: "100%" }}>
      <div
        ref={container}
        className="map"
        role="region"
        aria-label="Delhi journey map"
        style={{ width: "100%", height: "100%" }}
      />
      {journey && <button type="button" className="map-refit" aria-label={lang === "hi" ? "पूरा सफ़र दिखाएँ" : "Show entire journey"} title={lang === "hi" ? "पूरा सफ़र दिखाएँ" : "Show entire journey"} onClick={() => fitRoute.current?.()}><Maximize size={19} /></button>}
      {tileError && (
        <div className="tile-warning" role="status">
          {t.mapTileError}
        </div>
      )}
    </div>
  );
}
