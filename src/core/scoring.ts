import { BASE_WEIGHTS, BUDGET_TIER_DEFS, INTEREST_LABELS, MONTHS_ES, PRIORITY_BY_ID } from "./catalog";
import { destinationOffers } from "./experiences";
import { estimateLongHaulHours, haversineKm } from "./geo";
import type { Criterion, CriterionScore, Destination, Interest, TravelerProfile } from "./types";
import { CRITERIA, CRITERIA_LABELS } from "./types";

const clamp = (v: number, lo = 0, hi = 10) => Math.max(lo, Math.min(hi, v));
const round1 = (v: number) => Math.round(v * 10) / 10;

export interface CandidateStop {
  dest: Destination;
  nights: number;
}

// ───────────────────────── Ponderaciones ─────────────────────────

export function effectiveWeights(profile: TravelerProfile, base: Record<Criterion, number> = BASE_WEIGHTS): {
  weights: Record<Criterion, number>;
  notes: string[];
} {
  const weights = { ...base };
  const notes: string[] = [];
  for (const p of profile.priorities) {
    const def = PRIORITY_BY_ID[p];
    if (!def?.weightBoost) continue;
    const isMust = profile.mustHave.includes(p);
    for (const [c, boost] of Object.entries(def.weightBoost)) {
      const factor = 1 + (boost as number) * (isMust ? 2 : 1);
      weights[c as Criterion] = round1(weights[c as Criterion] * factor);
    }
    notes.push(
      `«${def.label}»${isMust ? " (indispensable)" : ""} aumenta el peso de: ${Object.keys(def.weightBoost)
        .map((c) => CRITERIA_LABELS[c as Criterion].toLowerCase())
        .join(", ")}.`,
    );
  }
  if (profile.budgetTier === "unlimited") {
    weights.budget = 0.3;
    notes.push("Presupuesto sin restricción: el criterio de presupuesto casi no influye.");
  }
  if (profile.kids.length || profile.partyType === "family") {
    weights.group = round1(weights.group * 1.5);
    notes.push("Viaje con chicos: aumenta el peso de la compatibilidad con el grupo.");
  }
  if (profile.exploratory) {
    weights.dates = round1(weights.dates * 0.5);
    notes.push("Sin fechas confirmadas: la adecuación a fechas pesa menos y se compara por temporadas.");
  }
  return { weights, notes };
}

// ───────────────────────── Clima ─────────────────────────

export function climateScoreFor(dest: Destination, month: number, profile: TravelerProfile): { score: number; notes: string[] } {
  const i = month - 1;
  const hi = dest.climate.hi[i];
  const rain = dest.climate.rain[i];
  const sea = dest.climate.sea?.[i];
  const wantsBeach = (profile.interests.beach ?? 0) >= 0.5 && (dest.tags.beach ?? 0) >= 2;
  const notes: string[] = [];
  let s = 10;
  if (wantsBeach) {
    if (hi < 24) s -= (24 - hi) * 0.9;
    if (hi > 33) s -= (hi - 33) * 0.8;
    if (sea !== undefined && sea < 23) {
      s -= (23 - sea) * 0.8;
      notes.push(`Mar fresco (~${sea} °C aprox.)`);
    }
  } else if (dest.kind === "nature") {
    if (hi < 8) s -= (8 - hi) * 0.5;
    if (hi > 30) s -= (hi - 30) * 0.6;
  } else {
    if (hi < 12) s -= (12 - hi) * 0.45;
    if (hi > 29) s -= (hi - 29) * 0.6;
  }
  s -= rain * 1.3;
  if (rain >= 2) notes.push("Época de lluvias más frecuentes");
  notes.unshift(`Máximas de ~${hi} °C (aprox.)`);
  return { score: clamp(s), notes };
}

export function bestMonths(dest: Destination, profile: TravelerProfile, count = 3): number[] {
  return Array.from({ length: 12 }, (_, i) => i + 1)
    .map((m) => ({ m, s: climateScoreFor(dest, m, profile).score - riskPenalty(dest, m, profile).penalty }))
    .sort((a, b) => b.s - a.s)
    .slice(0, count)
    .map((x) => x.m);
}

const SARGASSUM_PEAK = [5, 6, 7, 8];
const BEACHY = new Set(["beach", "resort", "island"]);

/**
 * Riesgo de temporada que desaconseja el destino para ese mes y ese perfil (no solo lo penaliza):
 * sargazo en su pico o monzón para quien busca playa, huracanes en la temporada más activa en
 * destinos de playa, y calor extremo para chicos chicos o personas con movilidad reducida.
 */
export function severeSeasonRisk(dest: Destination, month: number, profile: TravelerProfile): string | null {
  const wantsBeach = (profile.interests.beach ?? 0) >= 0.5;
  const beachy = BEACHY.has(dest.kind);
  for (const r of dest.risks ?? []) {
    if (!r.months.includes(month) || r.level === "low") continue;
    if (r.kind === "sargassum" && wantsBeach && SARGASSUM_PEAK.includes(month)) return r.note;
    if (r.kind === "monsoon" && wantsBeach && beachy) return r.note;
    if (r.kind === "hurricane" && beachy && [8, 9, 10].includes(month)) return r.note;
    if (r.kind === "heat" && (dest.climate.hi[month - 1] ?? 0) >= 38 && (profile.kids.some((k) => k < 6) || profile.reducedMobility)) return r.note;
  }
  return null;
}

export function riskPenalty(dest: Destination, month: number, profile: TravelerProfile): { penalty: number; notes: string[] } {
  let p = 0;
  const notes: string[] = [];
  for (const r of dest.risks ?? []) {
    if (!r.months.includes(month)) continue;
    let v = 0;
    switch (r.kind) {
      case "hurricane":
        v = r.level === "low" ? 0.5 : [8, 9, 10].includes(month) ? 3 : 1.5;
        break;
      case "monsoon":
        v = 2;
        break;
      case "heat":
        v = profile.kids.some((k) => k < 6) || profile.reducedMobility ? 3 : 1.5;
        break;
      case "cold":
        v = 1;
        break;
      case "closures":
        v = 2.5;
        break;
      case "sargassum":
        v = (profile.interests.beach ?? 0) >= 0.5 ? (SARGASSUM_PEAK.includes(month) ? 4 : 2) : 0.3;
        break;
      case "crowds":
        v = profile.mustHave.includes("avoid_crowds") ? 2 : 0.7;
        break;
      case "altitude":
        v = profile.reducedMobility || profile.kids.some((k) => k < 6) ? 3 : 1;
        break;
    }
    if (v > 0) {
      p += v;
      notes.push(r.note);
    }
  }
  return { penalty: p, notes };
}

// ───────────────────────── Puntaje de candidatos ─────────────────────────

function weightedAvg(stops: CandidateStop[], f: (d: Destination) => number): number {
  const total = stops.reduce((a, s) => a + s.nights, 0) || 1;
  return stops.reduce((a, s) => a + f(s.dest) * s.nights, 0) / total;
}

export function affinityOf(dest: Destination, profile: TravelerProfile): number {
  const entries = Object.entries(profile.interests) as [Interest, number][];
  if (!entries.length) return dest.firstTimerFriendly ? 7 : 6;
  let num = 0;
  let den = 0;
  for (const [i, w] of entries) {
    num += w * ((dest.tags[i] ?? 0) / 3);
    den += w;
  }
  let s = (num / den) * 10;
  if (profile.wishIds.includes(dest.id)) s += 2.5;
  for (const i of profile.strongIntents ?? []) s += ((dest.tags[i] ?? 0) - 1.5) * 1.2; // lo que más pidió pesa más
  const wanted = profile.experiences ?? [];
  if (wanted.length) {
    const offered = destinationOffers(dest, wanted);
    s += offered ? 2 + offered : -3; // pidió algo concreto: que el destino realmente lo ofrezca
  }
  if (dest.beach && (profile.interests.beach ?? 0) >= 0.5) {
    if (profile.beachPrefs.clearWater) s += (dest.beach.clarity - 2) * 1.8;
    if (profile.beachPrefs.calmSea) s += (dest.beach.calm - 2) * 0.8;
    if (profile.beachPrefs.waves) s += (2 - dest.beach.calm) * 0.8;
  }
  if (profile.visitedIds.includes(dest.id) && !profile.lovedIds.includes(dest.id)) s -= profile.includeKnown ? 1 : 4;
  else if ((profile.visitedCountries ?? []).includes(dest.countryCode) && !profile.wishIds.includes(dest.id)) s -= 1.5;
  if (profile.lovedIds.includes(dest.id) && profile.includeKnown) s += 1;
  if (profile.firstTimeEurope && dest.firstTimerFriendly) s += 1;
  if (!profile.firstTimeEurope && (profile.interests.offbeat ?? 0) > 0.4 && dest.tranquility >= 3) s += 0.5;
  return clamp(s);
}

const TIER_LEVEL: Record<string, number> = Object.fromEntries(BUDGET_TIER_DEFS.map((t) => [t.id, t.level]));

export function scoreCandidate(
  stops: CandidateStop[],
  profile: TravelerProfile,
  weights: Record<Criterion, number>,
): { scores: Record<Criterion, CriterionScore>; compatibility: number; travelHours: number | null; months: number[] } {
  const scores = {} as Record<Criterion, CriterionScore>;
  const totalNights = stops.reduce((a, s) => a + s.nights, 0);

  // Afinidad
  {
    const v = weightedAvg(stops, (d) => affinityOf(d, profile));
    const top = (Object.entries(profile.interests) as [Interest, number][]).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const factors: CriterionScore["factors"] = [];
    for (const [i] of top) {
      const avg = weightedAvg(stops, (d) => d.tags[i] ?? 0);
      if (avg >= 2) factors.push({ sign: "+", text: `Muy buena oferta de ${INTEREST_LABELS[i]}` });
      else if (avg < 1) factors.push({ sign: "-", text: `Poca oferta de ${INTEREST_LABELS[i]}` });
    }
    const visited = stops.filter((s) => profile.visitedIds.includes(s.dest.id));
    if (visited.length) factors.push({ sign: "-", text: `Incluye lugares que ya conocés: ${visited.map((s) => s.dest.name).join(", ")}` });
    const wish = stops.filter((s) => profile.wishIds.includes(s.dest.id));
    if (wish.length) factors.push({ sign: "+", text: `Incluye lo que mencionaste: ${wish.map((s) => s.dest.name).join(", ")}` });
    scores.affinity = { value: round1(v), weight: weights.affinity, factors };
  }

  // Meses a evaluar: los del cliente o, si no hay, la mejor época del primer destino.
  const months = profile.months.length ? profile.months : bestMonths(stops[0].dest, profile, 1);

  // Clima
  {
    const notes = new Set<string>();
    const v =
      months.reduce((acc, m) => acc + weightedAvg(stops, (d) => climateScoreFor(d, m, profile).score), 0) / months.length;
    const factors: CriterionScore["factors"] = [];
    for (const s of stops) {
      const c = climateScoreFor(s.dest, months[0], profile);
      c.notes.forEach((n) => notes.add(`${s.dest.name}: ${n}`));
      if (c.score >= 8) factors.push({ sign: "+", text: `${s.dest.name}: clima habitualmente favorable en ${MONTHS_ES[months[0] - 1]}` });
      else if (c.score < 5) factors.push({ sign: "-", text: `${s.dest.name}: clima menos favorable en ${MONTHS_ES[months[0] - 1]}` });
    }
    scores.climate = { value: round1(v), weight: weights.climate, factors };
  }

  // Riesgos
  {
    const factors: CriterionScore["factors"] = [];
    let pen = 0;
    for (const s of stops) {
      for (const m of months) {
        const r = riskPenalty(s.dest, m, profile);
        pen += (r.penalty * s.nights) / Math.max(1, totalNights);
        r.notes.forEach((n) => factors.some((f) => f.text.endsWith(n)) || factors.push({ sign: "-", text: `${s.dest.name}: ${n}` }));
      }
    }
    pen /= months.length;
    if (!factors.length) factors.push({ sign: "+", text: "Sin riesgos estacionales relevantes registrados para la época" });
    scores.risks = { value: round1(clamp(10 - pen * 1.6)), weight: weights.risks, factors };
  }

  // Adecuación a fechas
  {
    const factors: CriterionScore["factors"] = [];
    let v: number;
    if (profile.exploratory && !profile.months.length) {
      v = 7;
      factors.push({ sign: "-", text: "Sin fechas definidas: se evaluó la mejor época de cada destino" });
    } else {
      const m = months[0];
      const best = new Set(stops.flatMap((s) => bestMonths(s.dest, profile, 4)));
      v = best.has(m) ? 9 : 6.5;
      if (best.has(m)) factors.push({ sign: "+", text: `${MONTHS_ES[m - 1]} está entre los mejores meses para este destino` });
      else factors.push({ sign: "-", text: `${MONTHS_ES[m - 1]} no es de los meses ideales` });
      const high = stops.filter((s) => s.dest.highSeason?.includes(m));
      if (high.length) {
        v -= 0.8;
        factors.push({ sign: "-", text: `Temporada alta en ${high.map((s) => s.dest.name).join(", ")}: más demanda (reservar con anticipación)` });
      }
      if (profile.exploratory) factors.push({ sign: "-", text: "Época aproximada, sin fechas confirmadas" });
    }
    scores.dates = { value: round1(clamp(v)), weight: weights.dates, factors };
  }

  // Logística
  {
    const factors: CriterionScore["factors"] = [];
    let v = 10 - (stops.length - 1) * 1.1;
    for (let i = 1; i < stops.length; i++) {
      const km = haversineKm(stops[i - 1].dest, stops[i].dest);
      if (km > 900) {
        v -= 1;
        factors.push({ sign: "-", text: `Tramo largo ${stops[i - 1].dest.name} → ${stops[i].dest.name} (~${Math.round(km)} km)` });
      }
    }
    if (profile.avoidHotelChanges && stops.length > 1) {
      v -= (stops.length - 1) * 1.2;
      factors.push({ sign: "-", text: `${stops.length - 1} cambio(s) de hotel` });
    }
    if (stops.length === 1) factors.push({ sign: "+", text: "Un único alojamiento, sin traslados internos" });
    if (stops.every((s) => s.dest.walking === 1) && (profile.reducedMobility || profile.kids.length)) factors.push({ sign: "+", text: "Destinos con poca exigencia de caminatas" });
    scores.logistics = { value: round1(clamp(v)), weight: weights.logistics, factors };
  }

  // Presupuesto (por nivel, sin importes)
  let travelHours: number | null = null;
  if (profile.originCoords) travelHours = estimateLongHaulHours(profile.originCoords, stops[0].dest);
  {
    const factors: CriterionScore["factors"] = [];
    const tier = TIER_LEVEL[profile.budgetTier] ?? 3;
    let required = weightedAvg(stops, (d) => d.costLevel);
    if (travelHours !== null && travelHours > 16) {
      required += 0.8;
      factors.push({ sign: "-", text: "Vuelos de larga distancia: suelen pesar mucho en el total" });
    } else if (travelHours !== null && travelHours < 6) {
      required -= 0.5;
      factors.push({ sign: "+", text: "Distancia corta desde el origen" });
    }
    if (stops.length > 3) required += 0.3;
    const gap = required - tier;
    let v: number;
    if (profile.budgetTier === "unlimited") v = 10;
    else if (gap <= 0) v = 10 - Math.max(0, -gap - 2.5) * 0.6;
    else v = 10 - gap * 2.6;
    if (gap > 0.7) factors.push({ sign: "-", text: "El nivel de costos habitual del destino supera el nivel de presupuesto indicado" });
    else factors.push({ sign: "+", text: "Nivel de costos habitual compatible con el presupuesto indicado" });
    factors.push({ sign: "-", text: "Evaluación orientativa por nivel de costos: no es una cotización" });
    scores.budget = { value: round1(clamp(v)), weight: weights.budget, factors };
  }

  // Tiempo de traslado
  {
    const factors: CriterionScore["factors"] = [];
    let v = 7;
    if (travelHours !== null) {
      const allowance = 5 + (profile.nights ?? totalNights) * 0.55;
      v = 10 - Math.max(0, travelHours - allowance) * 0.55;
      factors.push({ sign: travelHours <= allowance ? "+" : "-", text: `~${travelHours} h de viaje estimadas desde ${profile.originLabel} (estimación)` });
    } else {
      factors.push({ sign: "-", text: "Origen sin coordenadas: tiempo de vuelo no estimado" });
    }
    scores.travelTime = { value: round1(clamp(v)), weight: weights.travelTime, factors };
  }

  // Ritmo
  {
    const factors: CriterionScore["factors"] = [];
    const nightsPerStop = totalNights / stops.length;
    const desired = profile.pace === "relaxed" ? 5 : profile.pace === "intense" ? 2.6 : 3.6;
    let v = 10 - Math.abs(nightsPerStop - desired) * (nightsPerStop < desired ? 1.6 : 0.5);
    const effortAvg = weightedAvg(stops, (d) => d.walking);
    if (effortAvg > 2.4 && profile.pace === "relaxed") {
      v -= 1;
      factors.push({ sign: "-", text: "Destinos que implican caminar bastante" });
    }
    factors.push({ sign: "+", text: `Promedio de ${Math.round(nightsPerStop * 10) / 10} noches por destino` });
    scores.pace = { value: round1(clamp(v)), weight: weights.pace, factors };
  }

  // Experiencias
  {
    const top = (Object.entries(profile.interests) as [Interest, number][]).filter(([, w]) => w >= 0.5).map(([i]) => i);
    const count = stops.reduce(
      (acc, s) =>
        acc +
        s.dest.highlights.filter(
          (h) => (!h.months || months.some((m) => h.months!.includes(m))) && (top.length === 0 || h.tags.some((t) => top.includes(t))) && h.effort <= profile.effortCap,
        ).length,
      0,
    );
    const v = clamp(2 + count * 1.3);
    scores.experiences = {
      value: round1(v),
      weight: weights.experiences,
      factors: [{ sign: count >= 4 ? "+" : "-", text: `${count} experiencias de la biblioteca alineadas con tus intereses` }],
    };
  }

  // Grupo
  {
    const factors: CriterionScore["factors"] = [];
    let v = 7;
    if (profile.partyType === "family" || profile.kids.length) {
      v = weightedAvg(stops, (d) => d.familyFit) * 3.3;
      if (profile.kids.some((k) => k < 6)) v -= weightedAvg(stops, (d) => (d.walking >= 3 ? 1.5 : 0));
      factors.push({ sign: v >= 7 ? "+" : "-", text: v >= 7 ? "Muy buena oferta para familias" : "Oferta limitada para chicos" });
    } else if (profile.partyType === "couple") {
      v = 5 + weightedAvg(stops, (d) => d.tags.romance ?? 0) * 1.6;
      factors.push({ sign: v >= 8 ? "+" : "-", text: v >= 8 ? "Ambiente ideal para parejas" : "Ambiente menos orientado a parejas" });
    } else if (profile.partyType === "friends" || profile.partyType === "group") {
      v = 5 + weightedAvg(stops, (d) => d.tags.nightlife ?? 0) * 1.4;
      factors.push({ sign: v >= 8 ? "+" : "-", text: v >= 8 ? "Buena vida social y nocturna" : "Ambiente más tranquilo" });
    } else if (profile.partyType === "solo") {
      v = 6 + weightedAvg(stops, (d) => (d.kind === "city" ? 2 : 1));
      factors.push({ sign: "+", text: "Fácil de recorrer viajando solo" });
    }
    if (profile.reducedMobility) {
      const w = weightedAvg(stops, (d) => d.walking);
      v -= (w - 1) * 2;
      factors.push({ sign: w <= 1.5 ? "+" : "-", text: w <= 1.5 ? "Poca exigencia de caminatas" : "Calles en pendiente o recorridos largos a pie" });
    }
    scores.group = { value: round1(clamp(v)), weight: weights.group, factors };
  }

  let num = 0;
  let den = 0;
  for (const c of CRITERIA) {
    num += scores[c].value * scores[c].weight;
    den += scores[c].weight;
  }
  let compatibility = Math.round((num / den) * 10);
  // Indispensables no cumplidos: penalización fuerte y visible.
  for (const m of profile.mustHave) {
    if (m === "quiet_beaches" && weightedAvg(stops, (d) => d.tags.beach ?? 0) < 2) compatibility -= 15;
    if (m === "few_hotel_changes" && stops.length > 1) compatibility -= 6 * (stops.length - 1);
    if (m === "historic_sites" && weightedAvg(stops, (d) => d.tags.history ?? 0) < 2) compatibility -= 10;
    if (m === "nightlife" && weightedAvg(stops, (d) => d.tags.nightlife ?? 0) < 1.5) compatibility -= 10;
  }
  return { scores, compatibility: Math.max(0, Math.min(100, compatibility)), travelHours, months };
}
