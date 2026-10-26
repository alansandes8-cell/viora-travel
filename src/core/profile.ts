import { BUDGET_TIER_DEFS, INTEREST_LABELS, LODGING_LABELS, MONTHS_ES, ORIGIN_CITIES, PRIORITY_BY_ID, TRIP_STYLE_BY_ID } from "./catalog";
import { SUPER_REGION } from "./library";
import { extractInterests, extractNights, matchCountries, matchDestinations, matchRegions, normalize } from "./text";
import type { Destination, InferredItem, Interest, IntakeAnswers, MissingItem, Pace, TravelerProfile } from "./types";

export function nightsBetween(a: string, b: string): number {
  const d1 = Date.parse(a + "T00:00:00Z");
  const d2 = Date.parse(b + "T00:00:00Z");
  return Math.round((d2 - d1) / 86400000);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(Date.parse(iso + "T00:00:00Z") + days * 86400000);
  return d.toISOString().slice(0, 10);
}

const EUROPE_CLUSTERS = new Set(["iberia", "europa-occidental", "europa-central", "italia", "mediterraneo-este"]);

function asList(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

/**
 * Convierte las respuestas del cuestionario en un perfil estructurado.
 * Determinista: separa lo declarado de lo inferido y lista lo que falta.
 */
export function buildProfile(answers: IntakeAnswers, library: Destination[]): TravelerProfile {
  const declared: { label: string; value: string }[] = [];
  const inferred: InferredItem[] = [];
  const missing: MissingItem[] = [];
  const dream = answers.dreamText ?? "";
  const extra = answers.extra ?? {};

  // ── Intereses ──
  const interests: Partial<Record<Interest, number>> = {};
  const bump = (i: Interest, v: number) => (interests[i] = Math.min(1, Math.max(interests[i] ?? 0, v)));
  for (const s of answers.tripStyles) {
    const def = TRIP_STYLE_BY_ID[s];
    if (!def) continue;
    for (const [k, v] of Object.entries(def.interests)) bump(k as Interest, v as number);
  }
  answers.priorities.selected.forEach((p) => {
    const def = PRIORITY_BY_ID[p];
    const rank = answers.priorities.ranking.indexOf(p);
    const factor = rank === -1 ? 0.7 : Math.max(0.6, 1 - rank * 0.08);
    for (const [k, v] of Object.entries(def?.interests ?? {})) bump(k as Interest, (v as number) * factor);
  });
  const textInterests = extractInterests(dream);
  if (textInterests.length) {
    textInterests.forEach((i) => bump(i, Math.max(interests[i] ?? 0, 0.8)));
    inferred.push({
      key: "dream_interests",
      label: "Intereses detectados en tu descripción",
      value: textInterests.map((i) => INTEREST_LABELS[i]).join(", "),
      rationale: "Palabras clave encontradas en el texto libre.",
      confidence: "medium",
      by: "rules",
    });
  }
  for (const i of asList(extra.euro_interests)) bump(i as Interest, 0.9);
  for (const i of asList(extra.kid_interests)) bump(i as Interest, 0.8);
  if (extra.romantic_setting === "beach") bump("beach", 0.9);
  if (extra.romantic_setting === "mountain") bump("nature", 0.9);
  if (extra.romantic_setting === "villages") bump("offbeat", 0.7);
  if (extra.romantic_setting === "cities") bump("culture", 0.8);
  if (extra.beach_vibe === "activities") bump("adventure", 0.6);
  if (extra.beach_vibe === "quiet") bump("relax", 1);

  // ── Ritmo ──
  const pr = new Set(answers.priorities.selected);
  let paceScore = 0;
  if (pr.has("slow_pace")) paceScore -= 2;
  if (pr.has("rest")) paceScore -= 1;
  if (pr.has("free_time")) paceScore -= 1;
  if (pr.has("few_hotel_changes")) paceScore -= 1;
  if (pr.has("many_places")) paceScore += 2;
  if (answers.tripStyles.includes("backpacker")) paceScore += 1;
  if (extra.depth === "many") paceScore += 1.5;
  if (extra.depth === "few") paceScore -= 1.5;
  if (answers.party.childrenAges.some((a) => a < 6)) paceScore -= 1;
  if (answers.party.mobility && answers.party.mobility !== "none") paceScore -= 1.5;
  const pace: Pace = paceScore <= -1.5 ? "relaxed" : paceScore >= 1.5 ? "intense" : "balanced";
  inferred.push({
    key: "pace",
    label: "Ritmo de viaje",
    value: pace === "relaxed" ? "Tranquilo" : pace === "intense" ? "Intenso" : "Equilibrado",
    rationale: "Deducido de tus prioridades (descanso, tiempo libre, conocer muchos lugares) y del grupo de viaje.",
    confidence: "medium",
    by: "rules",
  });

  // ── Fechas y duración ──
  let nights: number | null = null;
  const months: number[] = [];
  let exploratory = true;
  if (answers.dates.mode === "exact" && answers.dates.departure && answers.dates.return) {
    nights = nightsBetween(answers.dates.departure, answers.dates.return);
    months.push(parseInt(answers.dates.departure.slice(5, 7), 10));
    exploratory = false;
    declared.push({ label: "Fechas", value: `${answers.dates.departure} al ${answers.dates.return}` });
  } else if (answers.dates.mode === "month" && answers.dates.months?.length) {
    months.push(...answers.dates.months);
    declared.push({ label: "Época", value: answers.dates.months.map((m) => MONTHS_ES[m - 1]).join(", ") });
  }
  if (nights === null && answers.dates.nights) {
    nights = answers.dates.nights;
  }
  if (nights !== null) declared.push({ label: "Duración", value: `${nights} noches` });
  if (nights === null) {
    const fromText = extractNights(dream);
    if (fromText) {
      nights = fromText;
      inferred.push({ key: "nights", label: "Duración", value: `${fromText} noches`, rationale: "Tomado de tu descripción.", confidence: "high", by: "rules" });
    }
  }
  if (nights === null) {
    missing.push({ key: "nights", label: "Cantidad de días disponibles", impact: "high" });
  }
  if (!months.length) missing.push({ key: "dates", label: "Fecha o época del viaje", impact: "high" });

  // ── Origen ──
  const originCity = ORIGIN_CITIES.find((c) => normalize(c.city) === normalize(answers.origin.city));
  const originAirports = answers.origin.airport ? [answers.origin.airport.toUpperCase()] : originCity?.airports ?? [];
  declared.push({ label: "Origen", value: `${answers.origin.city}, ${answers.origin.country}` });
  if (!originCity) {
    missing.push({ key: "origin_coords", label: "Aeropuerto de salida (para estimar tiempos de vuelo)", impact: "medium" });
  }

  // ── Grupo ──
  const travelers = answers.party.adults + answers.party.childrenAges.length;
  declared.push({
    label: "Viajeros",
    value: `${answers.party.adults} adulto(s)${answers.party.childrenAges.length ? ` y ${answers.party.childrenAges.length} menor(es) (${answers.party.childrenAges.join(", ")} años)` : ""}`,
  });
  if (answers.party.type === "family" && answers.party.childrenAges.length === 0) {
    missing.push({ key: "kids_ages", label: "Edades de los chicos", impact: "medium" });
  }

  // ── Presupuesto (solo nivel; los importes no forman parte del perfil) ──
  const tierDef = BUDGET_TIER_DEFS.find((t) => t.id === answers.budget.tier);
  declared.push({ label: "Nivel de presupuesto", value: tierDef?.label ?? answers.budget.tier });

  // ── Historial ──
  const visitedIds = new Set<string>();
  for (const v of answers.history.visited) matchDestinations(v, library).forEach((id) => visitedIds.add(id));
  const lovedIds = answers.history.loved.flatMap((v) => matchDestinations(v, library));
  const excluded = new Set<string>();
  for (const v of [...answers.history.wouldNotReturn, ...answers.history.avoid]) {
    matchDestinations(v, library).forEach((id) => excluded.add(id));
    matchCountries(v, library).forEach((id) => excluded.add(id));
  }
  const pendingIds = answers.history.pending.flatMap((v) => matchDestinations(v, library));
  if (answers.history.visited.length) declared.push({ label: "Ya conoce", value: answers.history.visited.join(", ") });
  if (excluded.size) declared.push({ label: "No quiere visitar", value: [...answers.history.wouldNotReturn, ...answers.history.avoid].join(", ") });

  // ── Deseos explícitos ──
  const wishIds = new Set<string>([...matchDestinations(dream, library), ...pendingIds]);
  const wishRegions = new Set<string>(matchRegions(dream));
  for (const r of asList(extra.continents)) wishRegions.add(r);
  if (answers.tripStyles.includes("eurotrip")) wishRegions.add("europa");
  if (answers.tripStyles.includes("theme_parks")) wishIds.add("orlando");
  for (const id of wishIds) excluded.delete(id);
  if (wishIds.size) {
    inferred.push({
      key: "wish",
      label: "Destinos mencionados o pendientes",
      value: [...wishIds].map((id) => library.find((d) => d.id === id)?.name ?? id).join(", "),
      rationale: "Mencionados en tu descripción o marcados como pendientes.",
      confidence: "high",
      by: "rules",
    });
  }

  const visitedEurope = [...visitedIds].some((id) => EUROPE_CLUSTERS.has(library.find((d) => d.id === id)?.cluster ?? ""));
  const wantsEurope = wishRegions.has("europa") || [...wishIds].some((id) => SUPER_REGION[library.find((d) => d.id === id)?.cluster ?? ""] === "europa");
  const firstTimeEurope = wantsEurope && !visitedEurope;
  if (wantsEurope) {
    inferred.push({
      key: "europe_experience",
      label: "Experiencia previa en Europa",
      value: firstTimeEurope ? "Primera vez" : "Ya conoce algunas ciudades",
      rationale: firstTimeEurope ? "No indicó ciudades europeas visitadas." : "Indicó ciudades europeas ya visitadas: se priorizan alternativas nuevas.",
      confidence: firstTimeEurope ? "medium" : "high",
      by: "rules",
    });
  }

  // ── Forma del viaje ──
  const shapes = answers.tripStyles.map((s) => TRIP_STYLE_BY_ID[s]?.shape ?? "open");
  let shape: TravelerProfile["shape"] = "open";
  if (shapes.length && shapes.every((s) => s === "single")) shape = "single";
  else if (shapes.length && shapes.every((s) => s !== "single") && shapes.includes("multi")) shape = "multi";
  if (pr.has("few_hotel_changes") && shape === "open") shape = "single";

  // ── Restricciones ──
  const reducedMobility = !!answers.party.mobility && answers.party.mobility !== "none";
  let effortCap: 1 | 2 | 3 = 3;
  if (reducedMobility || extra.reduce_walking === "yes") effortCap = 2;
  if (answers.party.mobility === "wheelchair") effortCap = 1;
  if (extra.physical_level === "soft") effortCap = Math.min(effortCap, 2) as 1 | 2;
  const lodging = answers.stay.lodgingTypes;
  const allInclusive: TravelerProfile["allInclusive"] =
    extra.all_inclusive === "yes" || lodging.includes("all_inclusive") ? "yes" : extra.all_inclusive === "no" ? "no" : "any";
  if (lodging.length) declared.push({ label: "Alojamiento preferido", value: lodging.map((l) => LODGING_LABELS[l]).join(", ") });

  if (!answers.tripStyles.length || answers.tripStyles.includes("discover")) {
    if (!Object.keys(interests).length) missing.push({ key: "interests", label: "Qué tipo de experiencias te atraen", impact: "high" });
  }

  return {
    declared,
    inferred,
    missing,
    interests,
    pace,
    shape,
    nights,
    months,
    exploratory,
    flexibleDays: answers.dates.flexibilityDays ?? 0,
    kids: answers.party.childrenAges,
    reducedMobility,
    budgetTier: answers.budget.tier,
    visitedIds: [...visitedIds],
    excludedIds: [...excluded],
    lovedIds,
    pendingIds,
    firstTimeEurope,
    avoidHotelChanges: pr.has("few_hotel_changes"),
    noCar: !!answers.stay.noCarRental || !answers.stay.transport.includes("car"),
    mustHave: answers.priorities.mustHave,
    priorities: answers.priorities.selected,
    partyType: answers.party.type,
    travelers,
    originLabel: `${answers.origin.city}, ${answers.origin.country}`,
    originCoords: originCity ? { lat: originCity.lat, lng: originCity.lng } : null,
    originAirports,
    wishIds: [...wishIds],
    wishRegions: [...wishRegions],
    effortCap,
    includeKnown: extra.include_known === "yes",
    preferFlightsOverLongTrains: extra.long_trains === "no",
    allInclusive,
    beachPrefs: {
      clearWater: /turquesa|cristalin|transparente|arena blanca|paradisi/.test(normalize(dream)) || extra.sea_type === "calm",
      calmSea: extra.sea_type === "calm" || answers.party.childrenAges.some((a) => a < 8),
      waves: extra.sea_type === "waves",
    },
  };
}
