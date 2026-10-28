import { MONTHS_ES, TRIP_STYLE_DEFS } from "./catalog";
import { EXPERIENCES, detectExperiences } from "./experiences";
import { classifyMentions, extractNights, normalize } from "./text";
import type { Destination, IntakeAnswers, PartyType, TripStyle } from "./types";

/** Lo que se entendió del texto libre, listo para completar el cuestionario. */
export interface DreamReading {
  destinations: string[]; // ids de la biblioteca
  countries: string[]; // códigos ISO de países de la biblioteca
  nights?: number;
  months: number[];
  partyType?: PartyType;
  adults?: number;
  childrenAges: number[];
  styles: TripStyle[];
  experiences: string[];
  multiCity?: boolean;
}

const MONTH_RE = new RegExp(`\\b(${MONTHS_ES.join("|")})\\b`, "g");

/** Lectura por reglas (sin IA). */
export function readDreamRules(text: string, library: Destination[]): DreamReading {
  const t = normalize(text);
  const mentions = classifyMentions(text, library);
  const months = [...new Set([...t.matchAll(MONTH_RE)].map((m) => MONTHS_ES.indexOf(m[1]) + 1))];
  let partyType: PartyType | undefined;
  if (/\b(mi pareja|mi novi[oa]|mi espos[oa]|mi marido|mi mujer|luna de miel|aniversario)\b/.test(t)) partyType = "couple";
  else if (/\b(mis hijos|los chicos|mis nenes|en familia|con los chicos|mi hij[oa])\b/.test(t)) partyType = "family";
  else if (/\b(amig[oa]s)\b/.test(t)) partyType = "friends";
  else if (/\b(solo|sola|yo solo)\b/.test(t)) partyType = "solo";
  const styles: TripStyle[] = [];
  if (/\b(playa|caribe|mar turquesa)\b/.test(t)) styles.push("beach_relax");
  if (/\b(disney|parques tematicos|universal)\b/.test(t)) styles.push("theme_parks");
  if (/\b(luna de miel)\b/.test(t)) styles.push("honeymoon");
  return {
    destinations: mentions.wish,
    countries: mentions.wishCountries,
    nights: extractNights(text) ?? undefined,
    months,
    partyType,
    childrenAges: [],
    styles,
    experiences: detectExperiences(text),
    multiCity: /\b(ciudades|recorrer|recorrido|ruta|varios destinos)\b/.test(t) || undefined,
  };
}

/** Normaliza una lectura (de la IA o de reglas) contra la biblioteca y el catálogo. */
export function sanitizeReading(r: Partial<DreamReading>, library: Destination[]): DreamReading {
  const ids = new Set(library.map((d) => d.id));
  const ccs = new Set(library.map((d) => d.countryCode));
  const styleIds = new Set(TRIP_STYLE_DEFS.map((s) => s.id));
  const expIds = new Set(EXPERIENCES.map((e) => e.id));
  const n = Number(r.nights);
  return {
    destinations: (r.destinations ?? []).filter((x) => ids.has(x)).slice(0, 8),
    countries: (r.countries ?? []).map((c) => String(c).toUpperCase()).filter((c) => ccs.has(c)).slice(0, 5),
    nights: Number.isFinite(n) && n >= 1 && n <= 90 ? Math.round(n) : undefined,
    months: (r.months ?? []).map(Number).filter((m) => m >= 1 && m <= 12).slice(0, 12),
    partyType: ["solo", "couple", "friends", "family", "group"].includes(String(r.partyType)) ? (r.partyType as PartyType) : undefined,
    adults: Number(r.adults) >= 1 && Number(r.adults) <= 20 ? Number(r.adults) : undefined,
    childrenAges: (r.childrenAges ?? []).map(Number).filter((a) => a >= 0 && a <= 17).slice(0, 8),
    styles: (r.styles ?? []).filter((s) => styleIds.has(s as TripStyle)).slice(0, 4) as TripStyle[],
    experiences: (r.experiences ?? []).filter((e) => expIds.has(e)).slice(0, 6),
    multiCity: r.multiCity ? true : undefined,
  };
}

/** ¿Alcanza para proponer sin más preguntas? (hay dónde o qué tipo de viaje). */
export function readingIsEnough(r: DreamReading): boolean {
  return r.destinations.length > 0 || r.countries.length > 0 || r.styles.length > 0 || r.experiences.length > 0;
}

/** Aplica la lectura a las respuestas sin pisar lo que la persona ya eligió. */
export function applyReading(a: IntakeAnswers, r: DreamReading): IntakeAnswers {
  const next: IntakeAnswers = structuredClone(a);
  if (!next.tripStyles.length && r.styles.length) next.tripStyles = r.styles;
  if (next.dates.mode !== "exact") {
    if (r.months.length && !next.dates.months?.length) next.dates = { ...next.dates, mode: "month", months: r.months };
    if (r.nights && !next.dates.nights) next.dates = { ...next.dates, nights: r.nights };
  }
  if (r.partyType) {
    next.party = { ...next.party, type: r.partyType, adults: r.adults ?? (r.partyType === "solo" ? 1 : Math.max(2, next.party.adults)) };
    if (r.childrenAges.length) next.party.childrenAges = r.childrenAges;
  }
  const extra = { ...next.extra };
  if (r.destinations.length) extra.ai_wish = r.destinations;
  if (r.countries.length) extra.ai_countries = r.countries;
  if (r.experiences.length) extra.ai_experiences = r.experiences;
  next.extra = extra;
  return next;
}

/** Frases cortas para mostrar «lo que entendimos». */
export function readingChips(r: DreamReading, library: Destination[]): string[] {
  const chips: string[] = [];
  const countryName = (cc: string) => library.find((d) => d.countryCode === cc)?.country.split("(")[0].trim() ?? cc;
  if (r.countries.length) chips.push(`📍 ${r.countries.map(countryName).join(", ")}`);
  if (r.destinations.length) chips.push(`📍 ${r.destinations.map((id) => library.find((d) => d.id === id)?.name ?? id).join(", ")}`);
  if (r.nights) chips.push(`🌙 ${r.nights} noches`);
  if (r.months.length) chips.push(`📅 ${r.months.map((m) => MONTHS_ES[m - 1]).join(", ")}`);
  if (r.partyType) chips.push({ solo: "🧍 Viaje solo", couple: "💑 En pareja", friends: "👯 Con amigos", family: "👨‍👩‍👧 En familia", group: "🚌 En grupo", other: "✨ Otro" }[r.partyType]);
  if (r.multiCity) chips.push("🗺️ Recorrer varias ciudades");
  for (const e of r.experiences) chips.push(`⭐ ${EXPERIENCES.find((x) => x.id === e)?.label ?? e}`);
  for (const s of r.styles) chips.push(`${TRIP_STYLE_DEFS.find((x) => x.id === s)?.emoji ?? ""} ${TRIP_STYLE_DEFS.find((x) => x.id === s)?.label ?? s}`);
  return chips;
}
