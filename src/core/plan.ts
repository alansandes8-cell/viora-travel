import { BASE_WEIGHTS, BUDGET_REGION_HINTS, MONTHS_ES } from "./catalog";
import { generateCandidates, tripNights, type Candidate } from "./candidates";
import { buildItinerary, newId } from "./itinerary";
import { BUDGET_REGION, ENTRY_LINKS, SUPER_REGION } from "./library";
import { buildProfile } from "./profile";
import { bestMonths, climateScoreFor, effectiveWeights, riskPenalty, scoreCandidate } from "./scoring";
import type {
  Alternative,
  Criterion,
  Destination,
  IntakeAnswers,
  KnownConnection,
  PlanDocument,
  SeasonWindow,
  TravelerProfile,
} from "./types";
import { CRITERIA, CRITERIA_LABELS } from "./types";
import { validateItinerary } from "./validators";

export interface PlanContext {
  library: Destination[];
  connections: KnownConnection[];
  baseWeights?: Record<Criterion, number>;
  now?: Date;
}

interface Scored extends Candidate {
  result: ReturnType<typeof scoreCandidate>;
}

const LABEL_BY_CRITERION: Partial<Record<Criterion, string>> = {
  budget: "Mayor afinidad con tu presupuesto",
  climate: "Mejor clima para tus fechas",
  logistics: "Logística más simple",
  affinity: "La más cercana a tu sueño",
  experiences: "Más experiencias para tus intereses",
  pace: "Mejor ritmo para disfrutar",
  group: "Ideal para tu grupo",
  travelTime: "Menos horas de viaje",
  risks: "Menos riesgos para la época",
};

function titleFor(c: Candidate): string {
  return joinNames(c.stops.map((s) => s.dest.name));
}

export function joinNames(names: string[]): string {
  if (names.length === 1) return names[0];
  if (names.some((n) => / y /.test(n))) return names.join(" · ");
  return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
}

function experienceType(c: Candidate): string {
  const kinds = new Set(c.stops.map((s) => s.dest.kind));
  if (c.stops.length === 1) {
    const k = c.stops[0].dest.kind;
    return k === "resort" ? "Resort y descanso" : k === "beach" || k === "island" ? "Playa" : k === "themepark" ? "Parques y entretenimiento" : k === "nature" ? "Naturaleza" : "Ciudad";
  }
  if (kinds.has("beach") || kinds.has("island")) return "Ciudad y playa";
  if (kinds.has("nature")) return "Naturaleza y ciudad";
  return "Multidestino urbano y cultural";
}

function selectTop(scored: Scored[], count = 3): Scored[] {
  const sorted = scored.slice().sort((a, b) => b.result.compatibility - a.result.compatibility);
  const picked: Scored[] = [];
  for (const c of sorted) {
    if (picked.length >= count) break;
    const primary = c.stops.reduce((a, b) => (b.nights > a.nights ? b : a)).dest.id;
    const conflict = picked.some((p) => {
      const pPrimary = p.stops.reduce((a, b) => (b.nights > a.nights ? b : a)).dest.id;
      if (pPrimary === primary) return true;
      const shared = p.stops.filter((s) => c.stops.some((x) => x.dest.id === s.dest.id)).length;
      return shared >= Math.max(1, Math.ceil(Math.min(p.stops.length, c.stops.length) * 0.6));
    });
    if (!conflict) picked.push(c);
  }
  // Si la diversidad dejó menos de 3 opciones (p. ej., un único país pedido), completar con las mejores restantes.
  for (const c of sorted) {
    if (picked.length >= count) break;
    if (!picked.includes(c)) picked.push(c);
  }
  return picked;
}

function deriveLabels(top: Scored[]): string[][] {
  const labels: string[][] = top.map(() => []);
  if (!top.length) return labels;
  labels[0].push("Mejor equilibrio para tu perfil");
  for (const c of CRITERIA) {
    const label = LABEL_BY_CRITERION[c];
    if (!label) continue;
    const values = top.map((t) => t.result.scores[c].value);
    const max = Math.max(...values);
    const winners = values.map((v, i) => (v === max ? i : -1)).filter((i) => i >= 0);
    if (winners.length !== 1) continue; // solo si hay una ganadora clara
    const second = values.slice().sort((a, b) => b - a)[1] ?? 0;
    if (max - second < 0.5) continue;
    const w = winners[0];
    if (labels[w].length < 2) labels[w].push(label);
  }
  // Cada alternativa debe tener al menos una etiqueta propia, derivada del criterio donde más se diferencia.
  const used = new Set(labels.flat());
  top.forEach((t, i) => {
    if (labels[i].length) return;
    const options = CRITERIA.filter((c) => LABEL_BY_CRITERION[c] && !used.has(LABEL_BY_CRITERION[c]!))
      .map((c) => {
        const others = top.filter((_, j) => j !== i).map((o) => o.result.scores[c].value);
        const avg = others.length ? others.reduce((a, b) => a + b, 0) / others.length : 0;
        return { c, diff: t.result.scores[c].value - avg };
      })
      .sort((a, b) => b.diff - a.diff);
    const tranquil = t.stops.length === 1 && t.stops[0].dest.tranquility >= 4 && !used.has("Ideal para descansar y desconectarse");
    const label = options[0] && options[0].diff > 0 ? LABEL_BY_CRITERION[options[0].c]! : tranquil ? "Ideal para descansar y desconectarse" : options[0] ? LABEL_BY_CRITERION[options[0].c]! : "Alternativa a considerar";
    labels[i].push(label);
    used.add(label);
  });
  return labels;
}

function toAlternative(c: Scored, labels: string[], profile: TravelerProfile): Alternative {
  const { scores, compatibility, travelHours, months } = c.result;
  const ranked = CRITERIA.map((k) => ({ k, s: scores[k] })).sort((a, b) => b.s.value * b.s.weight - a.s.value * a.s.weight);
  const pros = ranked.flatMap((r) => r.s.factors.filter((f) => f.sign === "+").map((f) => f.text)).slice(0, 5);
  const cons = ranked
    .slice()
    .reverse()
    .flatMap((r) => r.s.factors.filter((f) => f.sign === "-" && !f.text.startsWith("Evaluación orientativa")).map((f) => f.text))
    .slice(0, 5);
  const main = c.stops.reduce((a, b) => (b.nights > a.nights ? b : a)).dest;
  const month = months[0];
  const climateText = c.stops
    .map((s) => {
      const cl = climateScoreFor(s.dest, month, profile);
      return `${s.dest.name}: ${cl.notes.join("; ")}`;
    })
    .join(" · ");
  const warnings = [...new Set(c.stops.flatMap((s) => months.flatMap((m) => riskPenalty(s.dest, m, profile).notes)))];
  const countries = [...new Set(c.stops.map((s) => s.dest.countryCode))];
  const topCriterion = ranked[0].k;
  const mainReason =
    c.stops.length === 1
      ? `${main.summary} Se destaca por ${CRITERIA_LABELS[topCriterion].toLowerCase()}.`
      : `Una ruta que combina ${c.stops.map((s) => s.dest.name).join(", ")} con buena coherencia geográfica. Se destaca por ${CRITERIA_LABELS[topCriterion].toLowerCase()}.`;
  return {
    id: newId("alt"),
    title: titleFor(c),
    kind: c.kind,
    stops: c.stops.map((s) => ({ destinationId: s.dest.id, name: s.dest.name, country: s.dest.country, nights: s.nights })),
    summary: c.stops.length === 1 ? main.summary : c.stops.map((s) => s.dest.summary).slice(0, 2).join(" "),
    mainReason,
    idealTraveler: main.idealFor,
    pros,
    cons,
    scores,
    compatibility,
    labels,
    climateNote: {
      value: `${profile.months.length ? `En ${MONTHS_ES[month - 1]}` : `Mejor época sugerida: ${MONTHS_ES[month - 1]}`} — ${climateText}`,
      status: "estimate",
      note: "Valores climáticos habituales aproximados de la biblioteca de VIORA. No son un pronóstico ni una garantía.",
    },
    travelFromOrigin: {
      value: travelHours,
      status: travelHours === null ? "unavailable" : "estimate",
      note: "Estimación por distancia con conexiones típicas. Verificar itinerarios de vuelo reales.",
    },
    logisticsComplexity: c.stops.length === 1 ? "baja" : c.stops.length <= 3 ? "media" : "alta",
    lodgingChanges: c.stops.length - 1,
    tranquility: (() => {
      const t = c.stops.reduce((a, s) => a + s.dest.tranquility * s.nights, 0) / c.stops.reduce((a, s) => a + s.nights, 0);
      return t >= 3.8 ? "alta" : t >= 2.6 ? "media" : "baja";
    })(),
    experienceType: experienceType(c),
    activities: c.stops.flatMap((s) => s.dest.highlights.slice(0, 3).map((h) => h.name)).slice(0, 8),
    warnings,
    imageQuery: main.imageQuery,
    entryChecks: countries.flatMap((cc) => (ENTRY_LINKS[cc] ?? []).slice(0, 1)),
  };
}

function seasonalWindows(c: Scored, profile: TravelerProfile): SeasonWindow[] {
  const flexible = profile.exploratory || profile.flexibleDays >= 14;
  if (!flexible) return [];
  const months = profile.months.length && profile.flexibleDays < 60
    ? [...new Set(profile.months.flatMap((m) => [((m + 10) % 12) + 1, m, (m % 12) + 1]))]
    : Array.from({ length: 12 }, (_, i) => i + 1);
  const windows = months.map((m) => {
    const climate = c.stops.reduce((a, s) => a + climateScoreFor(s.dest, m, profile).score * s.nights, 0) / c.stops.reduce((a, s) => a + s.nights, 0);
    const risk = c.stops.reduce((a, s) => a + riskPenalty(s.dest, m, profile).penalty, 0) / c.stops.length;
    const high = c.stops.some((s) => s.dest.highSeason?.includes(m));
    const notes = [...new Set(c.stops.flatMap((s) => riskPenalty(s.dest, m, profile).notes))];
    return {
      month: m,
      label: MONTHS_ES[m - 1],
      climateScore: Math.round(Math.max(0, climate - risk) * 10) / 10,
      notes,
      hypothesis: high
        ? "Temporada alta habitual: mejor clima o vacaciones, con más demanda. Hipótesis a investigar, no confirma tarifas."
        : "Fuera de temporada alta habitual: podría haber menor demanda. Hipótesis a investigar, no confirma tarifas ni ahorro.",
    };
  });
  return windows.sort((a, b) => b.climateScore - a.climateScore).slice(0, profile.months.length ? 3 : 4);
}

/** Genera el plan completo de manera determinista a partir del cuestionario. */
export function generatePlan(answers: IntakeAnswers, ctx: PlanContext): PlanDocument {
  const profile = buildProfile(answers, ctx.library);
  const { weights, notes: weightNotes } = effectiveWeights(profile, ctx.baseWeights ?? BASE_WEIGHTS);
  const candidates = generateCandidates(profile, ctx.library);
  const scored: Scored[] = candidates.map((c) => ({ ...c, result: scoreCandidate(c.stops, profile, weights) }));
  const top = selectTop(scored, 3);
  const labels = deriveLabels(top);
  const alternatives = top.map((t, i) => toAlternative(t, labels[i], profile));
  const seasonal = top.map((t, i) => ({ alternativeId: alternatives[i].id, windows: seasonalWindows(t, profile) })).filter((s) => s.windows.length);

  const pendingInfo: string[] = profile.missing.map((m) => m.label);
  const checks = [] as PlanDocument["checks"];
  if ((candidates as { knownIncluded?: boolean }).knownIncluded) {
    checks.push({
      code: "known_included",
      severity: "info",
      message: "No había suficientes opciones nuevas para este perfil: algunas alternativas incluyen lugares que el cliente ya conoce.",
    });
  }
  if (!top.length) {
    checks.push({
      code: "no_candidates",
      severity: "error",
      message: "No se encontraron alternativas en la biblioteca para esta combinación de preferencias. Un agente debe investigar opciones manualmente.",
    });
  }

  const doc: PlanDocument = {
    schemaVersion: 1,
    generatedAt: (ctx.now ?? new Date()).toISOString(),
    engine: { kind: "rules" },
    title: buildTitle(answers, profile, alternatives[0]),
    concept: buildConcept(answers, profile),
    profile,
    weights,
    weightNotes,
    alternatives,
    seasonal,
    selectedAlternativeId: alternatives[0]?.id ?? null,
    itinerary: null,
    recommendations: [],
    checks,
    pendingInfo,
    entryRequirements: [],
  };
  if (alternatives[0]) selectAlternative(doc, alternatives[0].id, answers, ctx);
  return doc;
}

/** Construye (o reconstruye) el itinerario para la alternativa elegida. */
export function selectAlternative(doc: PlanDocument, alternativeId: string, answers: IntakeAnswers, ctx: PlanContext): PlanDocument {
  const alt = doc.alternatives.find((a) => a.id === alternativeId);
  if (!alt) throw new Error("Alternativa inexistente");
  const profile = doc.profile;
  const stops = alt.stops.map((s) => ({ dest: ctx.library.find((d) => d.id === s.destinationId)!, nights: s.nights })).filter((s) => s.dest);
  const startDate = answers.dates.mode === "exact" ? answers.dates.departure : undefined;
  const sameAlt = doc.itinerary?.alternativeId === alternativeId ? doc.itinerary : null;
  doc.selectedAlternativeId = alternativeId;
  doc.itinerary = buildItinerary(alternativeId, stops, profile, ctx.connections, { startDate, previous: sameAlt });
  refreshDerived(doc, ctx);
  return doc;
}

/** Recalcula validaciones, requisitos, recomendaciones y pendientes a partir del itinerario actual. */
export function refreshDerived(doc: PlanDocument, ctx: PlanContext): void {
  const it = doc.itinerary;
  const profile = doc.profile;
  const baseChecks = doc.checks.filter((c) => c.code === "no_candidates" || c.code === "known_included");
  if (!it) {
    doc.checks = baseChecks;
    return;
  }
  const expected = profile.nights ?? tripNights(profile);
  doc.checks = [...baseChecks, ...validateItinerary(it, profile, ctx.library, expected)];
  const countries = new Map<string, string>();
  for (const s of it.stops) {
    const d = ctx.library.find((x) => x.id === s.destinationId);
    if (d) countries.set(d.countryCode, d.country);
  }
  doc.entryRequirements = [...countries.entries()]
    .filter(([cc]) => cc !== "AR")
    .map(([cc, name]) => ({
      country: name,
      items: [
        {
          value: "Requisitos de pasaporte, visado o autorización electrónica según nacionalidad y tipo de pasaporte.",
          status: "pending" as const,
          note: "VIORA no emite garantías migratorias: verificar en fuentes oficiales antes de reservar.",
        },
        {
          value: "Vigencia mínima del pasaporte y requisitos de tránsito en las escalas.",
          status: "pending" as const,
        },
        { value: "Recomendaciones sanitarias y seguro de viaje adecuado.", status: "pending" as const },
      ],
      links: ENTRY_LINKS[cc] ?? [],
    }));

  const recs: string[] = [];
  const region = SUPER_REGION[ctx.library.find((d) => d.id === it.stops[0]?.destinationId)?.cluster ?? ""];
  const budgetHint = BUDGET_REGION_HINTS[BUDGET_REGION[region] ?? ""];
  if (budgetHint) recs.push(budgetHint);
  if (it.days.some((d) => d.activities.some((a) => a.booking === "required"))) recs.push("Algunas visitas requieren reserva anticipada: conviene asegurarlas apenas se confirmen las fechas.");
  if (it.stops.length > 1) recs.push("Viajar con equipaje liviano facilita los traslados entre ciudades.");
  if (profile.kids.length) recs.push("Con chicos, conviene alojarse cerca del transporte y prever pausas a media tarde.");
  recs.push("Contratar un seguro de viaje con cobertura médica acorde al destino.");
  doc.recommendations = recs;

  const pending = new Set(profile.missing.map((m) => m.label));
  if (profile.exploratory) pending.add("Fechas definitivas (la propuesta es exploratoria)");
  if (it.legs.some((l) => l.duration.status === "pending")) pending.add("Validar conexiones entre ciudades marcadas como pendientes");
  pending.add("Disponibilidad y tarifas reales de vuelos y alojamiento");
  if (doc.entryRequirements.length) pending.add("Requisitos migratorios según nacionalidad de cada viajero");
  doc.pendingInfo = [...pending];
}

function buildTitle(answers: IntakeAnswers, profile: TravelerProfile, alt?: Alternative): string {
  const who =
    profile.partyType === "couple"
      ? "en pareja"
      : profile.partyType === "family"
        ? "en familia"
        : profile.partyType === "friends"
          ? "con amigos"
          : profile.partyType === "solo"
            ? "a tu medida"
            : "a medida";
  if (!alt) return `Tu próximo viaje ${who}`;
  const n = alt.stops.reduce((a, s) => a + s.nights, 0);
  if (alt.stops.length > 2) {
    const countries = [...new Set(alt.stops.map((s) => s.country))];
    const list = countries.length > 1 ? `${countries.slice(0, -1).join(", ")} y ${countries[countries.length - 1]}` : countries[0];
    return `${n} noches por ${list} ${who}`;
  }
  return `${alt.title}: ${n} noches ${who}`;
}

function buildConcept(answers: IntakeAnswers, profile: TravelerProfile): string {
  if (answers.dreamText && answers.dreamText.trim().length > 10) return `Tu idea: «${answers.dreamText.trim().slice(0, 300)}»`;
  const bits: string[] = [];
  const top = Object.entries(profile.interests)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k);
  const words: Record<string, string> = {
    beach: "playa",
    relax: "descanso",
    culture: "cultura",
    history: "historia",
    gastronomy: "buena mesa",
    nature: "naturaleza",
    romance: "romance",
    family: "momentos en familia",
    themeparks: "parques",
    iconic: "lugares icónicos",
    adventure: "aventura",
    nightlife: "noches largas",
    shopping: "compras",
    architecture: "arquitectura",
    offbeat: "lugares auténticos",
    luxury: "experiencias especiales",
    wellness: "bienestar",
    wine: "vinos",
  };
  top.forEach((t) => words[t] && bits.push(words[t]));
  return bits.length ? `Un viaje pensado para combinar ${bits.join(", ")}.` : "Un viaje pensado alrededor de lo que te hace feliz.";
}

export { bestMonths };
