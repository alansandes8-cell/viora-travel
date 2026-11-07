import { MONTHS_ES } from "./catalog";
import { dailySpendFor } from "./daily-spend";
import { estimateFlight, estimateHotel } from "./fares";
import type { Destination } from "./types";

/**
 * Guía pública de un destino (páginas para buscadores): todo sale de los datos curados de la
 * biblioteca y de los estimadores. No se inventan datos: si falta algo, la sección no se muestra.
 */

export const RAIN_LABEL = ["Seco", "Pocas lluvias", "Lluvioso", "Muy lluvioso"] as const;

export interface MonthRow {
  month: number;
  name: string;
  hi: number | null;
  rain: number | null;
  sea: number | null;
  score: number;
  high: boolean;
  risks: string[];
}

const BEACHY = new Set(["beach", "resort", "island"]);
const SEVERE = new Set(["hurricane", "monsoon", "closures", "sargassum"]);

/** Puntaje 0–10 por mes según clima habitual y riesgos registrados (no es un pronóstico). */
export function monthTable(d: Destination): MonthRow[] {
  return MONTHS_ES.map((name, i) => {
    const m = i + 1;
    const hi = d.climate.hi[i] ?? null;
    const rain = d.climate.rain[i] ?? null;
    const sea = d.climate.sea?.[i] ?? null;
    let score = 10;
    if (hi !== null) {
      const [lo, top] = BEACHY.has(d.kind) ? [26, 33] : d.kind === "nature" ? [12, 27] : [16, 28];
      if (hi < lo) score -= Math.min(5, (lo - hi) * (BEACHY.has(d.kind) ? 0.6 : 0.4));
      if (hi > top) score -= Math.min(5, (hi - top) * 0.7);
    }
    if (rain !== null) score -= rain * 1.3;
    if (sea !== null && BEACHY.has(d.kind) && sea < 24) score -= Math.min(3, (24 - sea) * 0.6);
    const risks = (d.risks ?? []).filter((r) => r.months.includes(m));
    for (const r of risks) score -= r.level === "low" ? 0.5 : SEVERE.has(r.kind) ? 2.5 : 1.2;
    return { month: m, name, hi, rain, sea, score: Math.max(0, Math.round(score * 10) / 10), high: (d.highSeason ?? []).includes(m), risks: risks.map((r) => r.kind) };
  });
}

export function bestMonths(rows: MonthRow[], n = 4): MonthRow[] {
  return [...rows].sort((a, b) => b.score - a.score || a.month - b.month).slice(0, n).sort((a, b) => a.month - b.month);
}

/** «marzo, abril y mayo» */
export function listEs(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

export interface GuideCost {
  flight: [number, number] | null;
  flightHours: number | null;
  hotel3: [number, number];
  hotel4: [number, number];
  daily: { low: number; high: number; currency: "USD" | "EUR" };
  /** Ejemplo: 2 adultos, noches ideales, vuelo + hotel 4★ por persona. */
  examplePerPerson: [number, number] | null;
  nights: number;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Costos de referencia desde Buenos Aires en un mes recomendado que no sea temporada alta,
 * comprando con dos meses de anticipación. `airport` es el aeropuerto principal del destino.
 */
export function guideCost(d: Destination, airport: { lat: number; lng: number; countryCode: string } | null, today = new Date()): GuideCost {
  const rows = monthTable(d);
  const nights = d.nights.ideal;
  const target = bestMonths(rows, 6).find((r) => ![1, 2, 7, 12].includes(r.month))?.month ?? 5;
  let year = today.getUTCFullYear();
  const t = new Date(Date.UTC(year, target - 1, 10));
  if (t.getTime() - today.getTime() < 60 * 86400000) year += 1;
  const depart = `${year}-${String(target).padStart(2, "0")}-10`;
  const ret = iso(new Date(Date.parse(`${depart}T12:00:00Z`) + nights * 86400000));
  const EZE = { lat: -34.82, lng: -58.54, countryCode: "AR" };
  const fl = airport ? estimateFlight({ from: EZE, to: airport, depart, ret, adults: 1, children: 0, infants: 0, cabin: "economy" }, iso(new Date(Date.parse(`${depart}T12:00:00Z`) - 60 * 86400000))) : null;
  const flight = fl && fl.km > 200 ? fl : null;
  const h3 = estimateHotel(d.costLevel, depart, ret, 2, 3, []);
  const h4 = estimateHotel(d.costLevel, depart, ret, 2, 4, []);
  const daily = dailySpendFor(d, "moderate");
  const example: [number, number] | null = flight ? [flight.perAdult[0] + h4.total[0] / 2, flight.perAdult[1] + h4.total[1] / 2] : null;
  const r = (n: number) => (n >= 1000 ? Math.round(n / 50) * 50 : Math.round(n / 10) * 10);
  return {
    flight: flight?.perAdult ?? null,
    flightHours: flight?.hours ?? null,
    hotel3: h3.perNight,
    hotel4: h4.perNight,
    daily,
    examplePerPerson: example ? [r(example[0]), r(example[1])] : null,
    nights,
  };
}

export interface FaqItem {
  q: string;
  a: string;
}

const money = (n: number, cur = "US$") => `${cur} ${Math.round(n).toLocaleString("es-AR")}`;

export function guideFaq(d: Destination, cost: GuideCost, rows: MonthRow[]): FaqItem[] {
  const best = bestMonths(rows).map((r) => r.name);
  const worst = rows.filter((r) => r.risks.some((k) => SEVERE.has(k)) || r.score < 4).map((r) => r.name);
  const out: FaqItem[] = [];
  out.push({
    q: `¿Cuál es la mejor época para viajar a ${d.name}?`,
    a: `Por el clima habitual, los mejores meses suelen ser ${listEs(best)}.${worst.length ? ` Conviene tener en cuenta ${listEs(worst)}${(d.risks ?? []).find((r) => r.level !== "low") ? ` (${(d.risks ?? []).find((r) => r.level !== "low")!.note.replace(/\.$/, "")})` : ""}.` : ""} Es una referencia histórica, no un pronóstico.`,
  });
  out.push({
    q: `¿Cuántos días se necesitan para conocer ${d.name}?`,
    a: `Recomendamos unas ${d.nights.ideal} noches para disfrutarlo sin apuro (entre ${d.nights.min} y ${d.nights.max} según el ritmo y lo que quieras hacer).`,
  });
  if (cost.examplePerPerson)
    out.push({
      q: `¿Cuánto cuesta viajar a ${d.name} desde Argentina?`,
      a: `Como referencia, el vuelo ida y vuelta desde Buenos Aires en temporada media ronda ${money(cost.flight![0])} a ${money(cost.flight![1])} por persona, y un hotel 4 estrellas ${money(cost.hotel4[0])} a ${money(cost.hotel4[1])} la noche en habitación doble. Para ${cost.nights} noches, vuelo + hotel queda en ${money(cost.examplePerPerson[0])} a ${money(cost.examplePerPerson[1])} por persona, más unos ${cost.daily.currency === "EUR" ? "€" : "US$"} ${cost.daily.low}–${cost.daily.high} por día de gastos. Son estimados: el precio real depende de las fechas y la disponibilidad.`,
    });
  if (d.lodgingZones.length)
    out.push({
      q: `¿Dónde conviene alojarse en ${d.name}?`,
      a: d.lodgingZones.map((z) => `${z.name}: ${z.profile.replace(/\.$/, "")}`).join(". ") + ".",
    });
  if (d.highlights.length)
    out.push({
      q: `¿Qué no hay que perderse en ${d.name}?`,
      a: `${listEs(d.highlights.slice(0, 5).map((h) => h.name))}.${d.highlights.some((h) => h.booking === "required") ? ` Conviene reservar con anticipación: ${listEs(d.highlights.filter((h) => h.booking === "required").slice(0, 3).map((h) => h.name))}.` : ""}`,
    });
  if (d.familyFit >= 3) out.push({ q: `¿${d.name} es un buen destino para ir con chicos?`, a: `Sí: es uno de los destinos más cómodos para viajar en familia${d.highlights.some((h) => h.kidsOk) ? `, con actividades aptas para chicos como ${listEs(d.highlights.filter((h) => h.kidsOk).slice(0, 3).map((h) => h.name))}` : ""}.` });
  return out;
}

/** Año que se muestra en los títulos (desde octubre ya se busca el año siguiente). */
export function guideYear(today = new Date()): number {
  return today.getUTCMonth() >= 9 ? today.getUTCFullYear() + 1 : today.getUTCFullYear();
}
