import "server-only";
import data from "@/data/places.json";
import { normalize } from "@/core/text";
import { loadLibrary } from "./settings";

/** Datos: OurAirports (dominio público), vía el paquete «airports-json». Ver scripts/build-places.mjs. */
type Row = [iata: string, name: string, city: string, cc: string, lat: number, lng: number, large: number, keywords?: string];
const AIRPORTS = data.airports as Row[];
const COUNTRIES = data.countries as Record<string, string>;

export interface AirportHit {
  iata: string;
  name: string;
  city: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
}

export interface PlaceHit {
  kind: "city" | "country";
  label: string;
  detail?: string;
}

const cityOf = (c: string) => c.replace(/\s*\(.*\)\s*$/, "");
const INDEX = AIRPORTS.map((a) => ({
  a,
  city: normalize(cityOf(a[2])),
  name: normalize(a[1]),
  country: normalize(COUNTRIES[a[3]] ?? a[3]),
  keywords: (a[7] ?? "").split(",").filter(Boolean),
}));

function score(q: string, text: string, base: number): number {
  if (text === q) return base + 30;
  if (text.startsWith(q)) return base + 20;
  if (text.split(" ").some((w) => w.startsWith(q))) return base + 10;
  if (q.length >= 3 && text.includes(q)) return base;
  return 0;
}

export function searchAirports(raw: string, limit = 8): AirportHit[] {
  const q = normalize(raw).slice(0, 60);
  if (q.length < 2) return [];
  const upper = raw.trim().toUpperCase();
  return INDEX.map((x) => {
    // Ciudad a la que sirve el aeropuerto aunque esté en otro municipio (MVD → Montevideo).
    const kw = x.keywords.map((k) => ({ k, s: score(q, normalize(k), 48) })).sort((a, b) => b.s - a.s)[0];
    const cityScore = score(q, x.city, 50);
    let s = Math.max(cityScore, kw?.s ?? 0, score(q, x.name, 35), score(q, x.country, 15));
    if (upper.length === 3 && x.a[0] === upper) s = 200;
    return { x, s: s ? s + x.a[6] * 8 : 0, city: kw && kw.s > cityScore ? kw.k : cityOf(x.a[2]) };
  })
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s || a.x.a[2].localeCompare(b.x.a[2]))
    .slice(0, limit)
    .map(({ x: { a }, city }) => ({ iata: a[0], name: a[1], city, country: COUNTRIES[a[3]] ?? a[3], countryCode: a[3], lat: a[4], lng: a[5] }));
}

/** Ciudades (con aeropuerto o de la biblioteca) y países del mundo, en español cuando se conoce. */
export async function searchPlaces(raw: string, limit = 8): Promise<PlaceHit[]> {
  const q = normalize(raw).slice(0, 60);
  if (q.length < 2) return [];
  const hits = new Map<string, { hit: PlaceHit; s: number }>();
  const add = (hit: PlaceHit, s: number) => {
    const key = normalize(hit.label);
    if (s > 0 && (!hits.has(key) || hits.get(key)!.s < s)) hits.set(key, { hit, s });
  };
  for (const name of Object.values(COUNTRIES)) add({ kind: "country", label: name, detail: "País" }, score(q, normalize(name), 50));
  for (const d of await loadLibrary()) add({ kind: "city", label: d.name, detail: d.country }, score(q, normalize(d.name), 65));
  for (const x of INDEX) add({ kind: "city", label: cityOf(x.a[2]), detail: COUNTRIES[x.a[3]] ?? x.a[3] }, score(q, x.city, 40) + (score(q, x.city, 40) ? x.a[6] * 14 : 0));
  for (const x of INDEX) for (const k of x.keywords) add({ kind: "city", label: k, detail: COUNTRIES[x.a[3]] ?? x.a[3] }, score(q, normalize(k), 38));
  return [...hits.values()]
    .sort((a, b) => b.s - a.s || a.hit.label.localeCompare(b.hit.label))
    .slice(0, limit)
    .map((h) => h.hit);
}
