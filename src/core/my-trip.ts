/**
 * «Mi viaje»: utilidades puras para el cronograma, la cuenta regresiva y el plan diario.
 * Las fechas se manejan como texto AAAA-MM-DD (sin husos horarios).
 */

export const ITEM_KINDS = {
  flight: { label: "Vuelo", plural: "Vuelos", emoji: "✈️" },
  hotel: { label: "Alojamiento", plural: "Alojamientos", emoji: "🏨" },
  transfer: { label: "Traslado", plural: "Traslados", emoji: "🚐" },
  train: { label: "Tren", plural: "Trenes", emoji: "🚆" },
  bus: { label: "Bus", plural: "Buses", emoji: "🚌" },
  car: { label: "Auto de alquiler", plural: "Autos", emoji: "🚗" },
  activity: { label: "Actividad o excursión", plural: "Actividades y excursiones", emoji: "🎟️" },
  insurance: { label: "Asistencia al viajero", plural: "Asistencia al viajero", emoji: "🛡️" },
  other: { label: "Otro", plural: "Otros", emoji: "📄" },
} as const;
export type ItemKind = keyof typeof ITEM_KINDS;
export const isItemKind = (k: string): k is ItemKind => k in ITEM_KINDS;

const DAY = 86_400_000;
const toMs = (iso: string) => Date.parse(`${iso}T12:00:00Z`);
export const addDays = (iso: string, n: number) => new Date(toMs(iso) + n * DAY).toISOString().slice(0, 10);
export const diffDays = (a: string, b: string) => Math.round((toMs(b) - toMs(a)) / DAY);
export const isIsoDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(toMs(s));

export function datesBetween(start: string, end: string, max = 120): string[] {
  const n = Math.min(max, Math.max(0, diffDays(start, end)));
  return Array.from({ length: n + 1 }, (_, i) => addDays(start, i));
}

/** Bandera a partir del código de país (AR → 🇦🇷). */
export function flag(cc: string): string {
  const c = (cc ?? "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return "";
  return String.fromCodePoint(...[...c].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}

const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
export const weekday = (iso: string) => WEEKDAYS[new Date(toMs(iso)).getUTCDay()];
export const shortDate = (iso: string) => `${Number(iso.slice(8, 10))}/${Number(iso.slice(5, 7))}`;

export type TripPhase = { kind: "before"; days: number } | { kind: "during"; day: number; total: number } | { kind: "after" };

export function tripPhase(start: string, end: string, today: string): TripPhase {
  if (today < start) return { kind: "before", days: diffDays(today, start) };
  if (today <= end) return { kind: "during", day: diffDays(start, today) + 1, total: diffDays(start, end) + 1 };
  return { kind: "after" };
}

export interface CalendarCell {
  date: string;
  inTrip: boolean;
  /** Días que faltan (solo para la semana previa a la salida). */
  countdown: number | null;
}

/** Semanas de lunes a domingo que cubren el viaje (con la semana de la salida completa). */
export function calendarWeeks(start: string, end: string): CalendarCell[][] {
  const dow = (new Date(toMs(start)).getUTCDay() + 6) % 7; // lunes = 0
  const first = addDays(start, -dow);
  const lastDow = (new Date(toMs(end)).getUTCDay() + 6) % 7;
  const last = addDays(end, 6 - lastDow);
  const cells = datesBetween(first, last, 200).map((date) => ({
    date,
    inTrip: date >= start && date <= end,
    countdown: date < start ? diffDays(date, start) : null,
  }));
  return Array.from({ length: Math.ceil(cells.length / 7) }, (_, i) => cells.slice(i * 7, i * 7 + 7));
}

export interface PlanEntryLike {
  time: string;
  title: string;
  text: string;
  link: string;
  photo: string;
  itemId: string;
}
export interface PlanDayLike {
  date: string;
  city: string;
  countryCode: string;
  summary: string;
  entries: PlanEntryLike[];
}

export interface ItemLike {
  id: string;
  kind: string;
  title: string;
  place: string;
  startDate: string | null;
  startTime: string;
  endDate: string | null;
  endTime: string;
}

/**
 * Arma (o completa) el plan con un día por fecha. Respeta lo ya cargado y, donde falta,
 * completa la ciudad según el alojamiento de esa noche y agrega vuelos, trenes y traslados del día.
 */
export function buildPlan(start: string, end: string, existing: PlanDayLike[], items: ItemLike[], countryOf: (place: string) => string = () => ""): PlanDayLike[] {
  const byDate = new Map(existing.map((d) => [d.date, d]));
  return datesBetween(start, end).map((date) => {
    const prev = byDate.get(date);
    const day: PlanDayLike = prev ? { ...prev, entries: [...prev.entries] } : { date, city: "", countryCode: "", summary: "", entries: [] };
    if (!day.city) {
      const stay = items.find((i) => i.kind === "hotel" && i.startDate && i.endDate && i.startDate <= date && date < i.endDate);
      if (stay?.place) {
        day.city = stay.place;
        day.countryCode = day.countryCode || countryOf(stay.place);
      }
    }
    for (const it of items) {
      if (!["flight", "train", "bus", "transfer", "activity"].includes(it.kind) || it.startDate !== date) continue;
      if (day.entries.some((e) => e.itemId === it.id)) continue;
      day.entries.push({ time: it.startTime, title: it.title, text: "", link: "", photo: "", itemId: it.id });
    }
    day.entries.sort((a, b) => (a.time || "99").localeCompare(b.time || "99"));
    if (!day.summary && day.entries[0] && !prev) day.summary = day.entries[0].title;
    return day;
  });
}

/** Fecha de hoy en Argentina (UTC−3), como AAAA-MM-DD. */
export function todayAR(now: number = Date.now()): string {
  return new Date(now - 3 * 3600000).toISOString().slice(0, 10);
}
