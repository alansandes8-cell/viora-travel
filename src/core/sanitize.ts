import { MONTHS_ES } from "./catalog";
import { travelerPersona } from "./game";
import { modeLabel } from "./itinerary";
import { SEED_DESTINATIONS } from "./library";
import type { Criterion, DestinationKind, PlanDocument, VerificationStatus } from "./types";
import { CRITERIA, CRITERIA_LABELS, VERIFICATION_LABELS } from "./types";

/**
 * Vista del cliente. Se construye por LISTA BLANCA: solo los campos enumerados acá
 * llegan al navegador. No existe ningún campo de importes en este tipo.
 */
export interface ClientProposal {
  kind: "client_proposal";
  status: "preliminary" | "reviewed";
  title: string;
  concept: string;
  preferences: { label: string; value: string }[];
  exploratory: boolean;
  travelMonths: number[];
  persona: { emoji: string; name: string; tagline: string; traits: { label: string; value: number }[] };
  alternatives: {
    id: string;
    title: string;
    stops: { name: string; country: string; nights: number; kind: DestinationKind }[];
    summary: string;
    mainReason: string;
    idealTraveler: string;
    pros: string[];
    cons: string[];
    compatibility: number;
    labels: string[];
    criteria: { key: Criterion; label: string; value: number; factors: { sign: "+" | "-"; text: string }[] }[];
    climateNote: string;
    travelHours: number | null;
    logisticsComplexity: string;
    lodgingChanges: number;
    tranquility: string;
    experienceType: string;
    activities: string[];
    warnings: string[];
    imageQuery: string;
    seasonal: { label: string; climateScore: number; hypothesis: string }[];
  }[];
  selectedAlternativeId: string | null;
  itinerary: {
    startDate?: string;
    stops: { id: string; name: string; country: string; nights: number; kind: DestinationKind; lat: number | null; lng: number | null; lodgingZone?: string; arrivalDate?: string; departureDate?: string }[];
    legs: { from: string; to: string; mode: string; hours: number | null; status: string; operators: { name: string; url: string }[] }[];
    days: {
      n: number;
      date?: string;
      stopId: string;
      title: string;
      kind: string;
      activities: { name: string; why: string; hours: number; booking: string; seasonal?: string; effort: number; url?: string }[];
      food?: string;
      freeTime: string;
      rainPlan?: string;
      effort: number;
      logistics?: string;
    }[];
    lodging: { stopId: string; category: string; zone: string; zoneProfile: string; why: string; options: { name: string; location?: string; url?: string }[] }[];
  } | null;
  recommendations: string[];
  entryRequirements: { country: string; links: { label: string; url: string }[] }[];
  nextSteps: string[];
  disclaimer: string;
}

const MONEY_PATTERNS: RegExp[] = [
  /(?:U\$S|US\$|USD|ARS|EUR|BRL|R\$|€|£)\s?\d/i,
  /\$\s?\d/,
  /\d[\d.,]*\s?(?:usd|d[oó]lares|pesos|euros|reales|libras)\b/i,
  /\b(?:margen|comisi[oó]n|markup|tarifa neta|precio neto|costo neto)\b/i,
];

/** Busca importes o vocabulario comercial interno en cualquier string de un objeto. */
export function scanForMoney(value: unknown, path = "$"): { path: string; text: string }[] {
  const hits: { path: string; text: string }[] = [];
  const visit = (v: unknown, p: string) => {
    if (typeof v === "string") {
      if (MONEY_PATTERNS.some((re) => re.test(v))) hits.push({ path: p, text: v.slice(0, 120) });
    } else if (Array.isArray(v)) v.forEach((x, i) => visit(x, `${p}[${i}]`));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) visit(x, `${p}.${k}`);
  };
  visit(value, path);
  return hits;
}

const scrub = (s: string | undefined): string => (s && !MONEY_PATTERNS.some((re) => re.test(s)) ? s : "");
const scrubList = (l: string[]): string[] => l.map(scrub).filter(Boolean);

function statusLabel(s: VerificationStatus): string {
  return s === "pending" ? "Pendiente de validación" : VERIFICATION_LABELS[s];
}

const KIND_BY_ID = new Map(SEED_DESTINATIONS.map((d) => [d.id, d.kind]));
/** Tipo de paisaje (para la ilustración de respaldo). Paradas cargadas a mano: «city». */
function kindOf(id: string | null): DestinationKind {
  return (id && KIND_BY_ID.get(id)) || "city";
}

/** Parada principal de una alternativa (la de más noches): define su imagen de portada. */
export function mainStop<T extends { nights: number }>(a: { stops: T[] }): T | undefined {
  return a.stops.reduce<T | undefined>((best, s) => (!best || s.nights > best.nights ? s : best), undefined);
}

export function toClientProposal(doc: PlanDocument, status: ClientProposal["status"]): ClientProposal {
  const it = doc.itinerary;
  const seasonalByAlt = new Map(doc.seasonal.map((s) => [s.alternativeId, s.windows]));
  const proposal: ClientProposal = {
    kind: "client_proposal",
    status,
    title: scrub(doc.title),
    concept: scrub(doc.concept),
    preferences: doc.profile.declared.map((d) => ({ label: d.label, value: scrub(d.value) })).filter((d) => d.value),
    exploratory: doc.profile.exploratory,
    travelMonths: doc.profile.months,
    persona: travelerPersona(doc.profile),
    alternatives: doc.alternatives.map((a) => ({
      id: a.id,
      title: scrub(a.title),
      stops: a.stops.map((s) => ({ name: s.name, country: s.country, nights: s.nights, kind: kindOf(s.destinationId) })),
      summary: scrub(a.summary),
      mainReason: scrub(a.mainReason),
      idealTraveler: scrub(a.idealTraveler),
      pros: scrubList(a.pros),
      cons: scrubList(a.cons),
      compatibility: a.compatibility,
      labels: scrubList(a.labels),
      criteria: CRITERIA.map((c) => ({
        key: c,
        label: CRITERIA_LABELS[c],
        value: a.scores[c].value,
        factors: a.scores[c].factors.filter((f) => scrub(f.text)),
      })),
      climateNote: scrub(a.climateNote.value),
      travelHours: a.travelFromOrigin.value,
      logisticsComplexity: a.logisticsComplexity,
      lodgingChanges: a.lodgingChanges,
      tranquility: a.tranquility,
      experienceType: a.experienceType,
      activities: scrubList(a.activities),
      warnings: scrubList(a.warnings),
      imageQuery: a.imageQuery,
      seasonal: (seasonalByAlt.get(a.id) ?? []).map((w) => ({ label: w.label, climateScore: w.climateScore, hypothesis: scrub(w.hypothesis) })),
    })),
    selectedAlternativeId: doc.selectedAlternativeId,
    itinerary: it
      ? {
          startDate: it.startDate,
          stops: it.stops.map((s) => ({
            id: s.id,
            name: s.name,
            country: s.country,
            nights: s.nights,
            kind: kindOf(s.destinationId),
            lat: s.lat,
            lng: s.lng,
            lodgingZone: scrub(s.lodgingZone),
            arrivalDate: s.arrivalDate,
            departureDate: s.departureDate,
          })),
          legs: it.legs.map((l) => ({
            from: l.fromName,
            to: l.toName,
            mode: modeLabel(l.mode),
            hours: l.duration.value,
            status: statusLabel(l.duration.status),
            operators: l.operators,
          })),
          days: it.days.map((d) => ({
            n: d.n,
            date: d.date,
            stopId: d.stopId,
            title: scrub(d.title),
            kind: d.kind,
            activities: d.activities.map((a) => ({
              name: scrub(a.name),
              why: scrub(a.why),
              hours: a.hours,
              booking: a.booking,
              seasonal: scrub(a.seasonal),
              effort: a.effort,
              url: a.url,
            })),
            food: scrub(d.food),
            freeTime: scrub(d.freeTime),
            rainPlan: scrub(d.rainPlan),
            effort: d.effort,
            logistics: scrub(d.logistics),
          })),
          lodging: it.lodging.map((l) => ({
            stopId: l.stopId,
            category: scrub(l.category),
            zone: scrub(l.zone),
            zoneProfile: scrub(l.zoneProfile),
            why: scrub(l.why),
            options: l.options.map((o) => ({ name: scrub(o.name), location: scrub(o.location), url: o.url })).filter((o) => o.name),
          })),
        }
      : null,
    recommendations: scrubList(doc.recommendations),
    entryRequirements: doc.entryRequirements.map((e) => ({ country: e.country, links: e.links })),
    nextSteps: [
      "Elegí la alternativa que más te entusiasme (podés cambiarla cuando quieras).",
      "Pedile a VIORA TRAVEL una propuesta personalizada: un asesor revisa la ruta, verifica vuelos, alojamientos y disponibilidad.",
      "Con las fechas confirmadas, preparamos la cotización real y te acompañamos en las reservas.",
    ],
    disclaimer:
      "Propuesta orientativa generada a partir de tus respuestas. Los puntajes son recomendaciones del sistema, no garantías. El clima indicado es el habitual de la época, no un pronóstico. Horarios, disponibilidad y requisitos de viaje deben confirmarse antes de reservar.",
  };
  const hits = scanForMoney(proposal);
  if (hits.length) {
    // Defensa en profundidad: si algo se filtró, no se publica.
    throw new Error(`La propuesta del cliente contiene posibles importes en: ${hits.map((h) => h.path).join(", ")}`);
  }
  return proposal;
}

export function monthName(m: number): string {
  return MONTHS_ES[m - 1];
}
