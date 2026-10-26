"use client";

import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { RouteSketch } from "./route-sketch";

type Stop = { name: string; lat: number | null; lng: number | null; nights: number; zone?: string };

const STYLE = process.env.NEXT_PUBLIC_MAP_STYLE_URL || "https://tiles.openfreemap.org/styles/liberty";
const COLORS = ["#12a59b", "#f6a01a", "#ff5a5f", "#6b3fa0", "#149fc4"];

/**
 * Mapa interactivo (MapLibre). El proveedor de teselas es configurable; si no carga
 * (sin conexión, proveedor caído o desactivado con NEXT_PUBLIC_MAP_STYLE_URL=none),
 * se muestra el mapa esquemático. Las distancias no se muestran acá: solo la ruta.
 */
export function RouteMap({ stops, className }: { stops: Stop[]; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(STYLE === "none");
  const pts = stops.filter((s) => s.lat !== null && s.lng !== null) as (Stop & { lat: number; lng: number })[];

  useEffect(() => {
    if (failed || !ref.current || !pts.length) return;
    let map: import("maplibre-gl").Map | null = null;
    let cancelled = false;
    const timer = setTimeout(() => !cancelled && setFailed(true), 8000);
    import("maplibre-gl")
      .then((maplibregl) => {
        if (cancelled || !ref.current) return;
        maplibregl.setWorkerUrl("/vendor/maplibre-gl-worker.mjs");
        const m = new maplibregl.Map({ container: ref.current, style: STYLE, attributionControl: { compact: true }, cooperativeGestures: true });
        map = m;
        m.on("error", () => {
          if (!m.loaded()) setFailed(true);
        });
        m.on("load", () => {
          clearTimeout(timer);
          if (!map) return;
          map.addSource("route", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: pts.map((p) => [p.lng, p.lat]) } } });
          map.addLayer({ id: "route", type: "line", source: "route", paint: { "line-color": "#1b2a4a", "line-width": 3, "line-dasharray": [2, 2] } });
          pts.forEach((p, i) => {
            const el = document.createElement("div");
            el.style.cssText = `width:28px;height:28px;border-radius:999px;background:${COLORS[i % COLORS.length]};color:#fff;font:700 12px system-ui;display:flex;align-items:center;justify-content:center;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.25)`;
            el.textContent = String(i + 1);
            new maplibregl.Marker({ element: el })
              .setLngLat([p.lng, p.lat])
              .setPopup(new maplibregl.Popup({ offset: 16 }).setText(`${p.name} · ${p.nights} noches${p.zone ? ` · Zona sugerida: ${p.zone}` : ""}`))
              .addTo(map!);
          });
          const bounds = new maplibregl.LngLatBounds();
          pts.forEach((p) => bounds.extend([p.lng, p.lat]));
          map.fitBounds(bounds, { padding: 60, maxZoom: pts.length === 1 ? 9 : 7, duration: 0 });
        });
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      clearTimeout(timer);
      map?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [failed, JSON.stringify(pts)]);

  if (failed) return <RouteSketch stops={stops} className={className} />;
  return <div ref={ref} className={className} role="region" aria-label="Mapa de la ruta" />;
}
