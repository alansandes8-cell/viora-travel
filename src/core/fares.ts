import { haversineKm } from "./geo";
import type { Destination, LibraryActivity } from "./types";

/**
 * Precios ESTIMADOS de referencia para el buscador de vuelos, hoteles y actividades.
 * No son tarifas reales ni cotizaciones: sirven para que la persona tenga una idea y pida
 * el presupuesto. A propósito se calculan con margen hacia arriba (es peor estimar de menos:
 * si se muestran 3.000 y después cuesta 5.000, se pierde la venta).
 *
 * Calibración (clase turista, ida y vuelta, por adulto, con tasas, en dólares; temporada media,
 * comprando con 1–3 meses de anticipación). Valores de referencia saliendo de Buenos Aires:
 *   Santiago/Bariloche ~350–550 · San Pablo ~400–650 · Miami/Cancún ~950–1.500
 *   Nueva York ~1.100–1.700 · Madrid ~1.250–2.000 · Roma ~1.350–2.100 · Tokio ~2.050–3.250
 */

export type Cabin = "economy" | "premium" | "business" | "first";

export const CABIN_LABEL: Record<Cabin, string> = { economy: "Turista", premium: "Premium economy", business: "Ejecutiva", first: "Primera" };
const CABIN_FACTOR: Record<Cabin, number> = { economy: 1, premium: 1.7, business: 3.5, first: 6 };

export interface FareTable {
  /** Tarifa media ida y vuelta = base + porKm × distancia (km de ida). */
  base: number;
  perKm: number;
  /** Rango alrededor de la media: abajo poco, arriba bastante (margen de seguridad). */
  low: number;
  high: number;
  /** Vuelos dentro de un mismo país (suelen ser más baratos por km). */
  domestic: number;
  oneWay: number;
  child: number;
  infant: number;
  peakMonths: number[];
  peakFactor: number;
}

export const DEFAULT_FARES: FareTable = {
  base: 250,
  perKm: 0.115,
  low: 0.88,
  high: 1.38,
  domestic: 0.85,
  oneWay: 0.7,
  child: 0.8,
  infant: 0.12,
  peakMonths: [1, 2, 7, 12],
  peakFactor: 1.3,
};

export interface Place {
  lat: number;
  lng: number;
  countryCode: string;
}

export interface FlightQuery {
  from: Place;
  to: Place;
  /** AAAA-MM-DD */
  depart: string;
  /** AAAA-MM-DD o null si es solo ida. */
  ret: string | null;
  adults: number;
  children: number;
  infants: number;
  cabin: Cabin;
}

export interface FlightEstimate {
  km: number;
  hours: number;
  /** Cuando la distancia hace probable al menos una escala. */
  likelyStops: boolean;
  perAdult: [number, number];
  total: [number, number];
  passengers: number;
  notes: string[];
}

const MS_DAY = 86_400_000;
export const roundPrice = (n: number) => (n >= 1000 ? Math.round(n / 50) * 50 : Math.round(n / 10) * 10);
const r2 = (x: [number, number]): [number, number] => [roundPrice(x[0]), roundPrice(x[1])];
const monthOf = (iso: string) => Number(iso.slice(5, 7));

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / MS_DAY);
}

/** Horas de vuelo aproximadas (puerta a puerta del avión), sumando una escala típica en rutas largas. */
export function flightHours(km: number): number {
  const air = km / 780 + 0.6;
  return Math.round((km > 4500 ? air + 2.5 : air) * 2) / 2;
}

export function estimateFlight(q: FlightQuery, today: string, t: FareTable = DEFAULT_FARES): FlightEstimate {
  const km = Math.round(haversineKm(q.from, q.to));
  const notes: string[] = [];
  let mid = t.base + t.perKm * Math.max(km, 300);
  if (q.from.countryCode === q.to.countryCode) mid *= t.domestic;
  if (t.peakMonths.includes(monthOf(q.depart)) || (q.ret && t.peakMonths.includes(monthOf(q.ret)))) {
    mid *= t.peakFactor;
    notes.push("Fechas de temporada alta: suelen ser las más caras del año.");
  }
  const advance = daysBetween(today, q.depart);
  if (advance < 14) {
    mid *= 1.45;
    notes.push("Faltan menos de dos semanas: los precios suelen estar más altos.");
  } else if (advance < 35) mid *= 1.2;
  if (!q.ret) mid *= t.oneWay;
  mid *= CABIN_FACTOR[q.cabin];
  const perAdult: [number, number] = [mid * t.low, mid * t.high];
  const units = Math.max(1, q.adults) + q.children * t.child + q.infants * t.infant;
  return {
    km,
    hours: flightHours(km),
    likelyStops: km > 4500,
    perAdult: r2(perAdult),
    total: r2([perAdult[0] * units, perAdult[1] * units]),
    passengers: Math.max(1, q.adults) + q.children + q.infants,
    notes,
  };
}

// ───────────────────────── Hoteles ─────────────────────────

/** Habitación doble por noche (USD, con impuestos) en un 3★ bien ubicado, por nivel de costo del lugar (1 a 5). */
export const HOTEL_NIGHT: [number, number][] = [
  [60, 110],
  [85, 150],
  [120, 200],
  [170, 290],
  [240, 420],
];
export const STARS_FACTOR: Record<number, number> = { 3: 1, 4: 1.55, 5: 2.7 };

export interface HotelEstimate {
  nights: number;
  rooms: number;
  perNight: [number, number];
  total: [number, number];
  notes: string[];
}

export function estimateHotel(costLevel: number, checkin: string, checkout: string, guests: number, stars: number, peakMonths: number[] = [1, 2, 7, 12]): HotelEstimate {
  const nights = Math.max(1, daysBetween(checkin, checkout));
  const rooms = Math.max(1, Math.ceil(guests / 2));
  const [lo, hi] = HOTEL_NIGHT[Math.min(4, Math.max(0, Math.round(costLevel) - 1))];
  const notes: string[] = [];
  let f = STARS_FACTOR[stars] ?? 1;
  if (peakMonths.includes(monthOf(checkin))) {
    f *= 1.2;
    notes.push("Temporada alta: los hoteles suelen subir sus tarifas.");
  }
  if (guests % 2 === 1 && guests > 1) notes.push("Con número impar de personas puede convenir una habitación triple o familiar.");
  const perNight: [number, number] = [lo * f * rooms, hi * f * rooms];
  return { nights, rooms, perNight: r2(perNight), total: r2([perNight[0] * nights, perNight[1] * nights]), notes };
}

/** Nivel de costo de un lugar: el del destino de la biblioteca, o el promedio del país, o 3. */
export function costLevelFor(label: string, country: string | undefined, library: Destination[], norm: (s: string) => string): { level: number; destination: Destination | null } {
  const n = norm(label);
  const d = library.find((x) => norm(x.name) === n || norm(x.name).startsWith(n) || n.startsWith(norm(x.name)));
  if (d) return { level: d.costLevel, destination: d };
  const same = country ? library.filter((x) => norm(x.country) === norm(country)) : [];
  if (same.length) return { level: Math.round(same.reduce((a, x) => a + x.costLevel, 0) / same.length), destination: null };
  return { level: 3, destination: null };
}

// ───────────────────────── Actividades ─────────────────────────

/** Precio por adulto (USD) según el tipo de actividad, para un lugar de costo medio-alto (nivel 4). */
const ACTIVITY_PRICE: Record<LibraryActivity["kind"], [number, number] | null> = {
  museum: [25, 45],
  sight: [20, 45],
  tour: [45, 95],
  daytrip: [90, 190],
  beach: [0, 40],
  nature: [50, 130],
  food: [55, 120],
  experience: [45, 150],
  park: [120, 210],
  nightlife: [35, 90],
  shopping: null,
};
const COST_FACTOR = [0.6, 0.75, 0.9, 1, 1.15];

export interface ActivityEstimate {
  id: string;
  name: string;
  kind: LibraryActivity["kind"];
  hours: number;
  booking: LibraryActivity["booking"];
  kidsOk: boolean;
  /** null: entrada libre o costo muy variable. */
  perAdult: [number, number] | null;
  free: boolean;
}

export function estimateActivities(d: Destination): ActivityEstimate[] {
  const f = COST_FACTOR[Math.min(4, Math.max(0, d.costLevel - 1))];
  return d.highlights.map((a) => {
    const base = ACTIVITY_PRICE[a.kind];
    const free = !base || (a.booking === "no" && (a.kind === "sight" || a.kind === "beach"));
    return {
      id: a.id,
      name: a.name,
      kind: a.kind,
      hours: a.hours,
      booking: a.booking,
      kidsOk: a.kidsOk ?? a.effort < 3,
      perAdult: free || !base ? null : r2([base[0] * f, base[1] * f]),
      free,
    };
  });
}
