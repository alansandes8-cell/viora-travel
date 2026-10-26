import type { IntakeAnswers, TravelerProfile } from "./types";

export interface SmartQuestion {
  id: string;
  text: string;
  hint?: string;
  multi?: boolean;
  options: { value: string; label: string }[];
  impact: number; // cuánto puede cambiar la recomendación (0..1)
}

interface QuestionDef extends SmartQuestion {
  when: (p: TravelerProfile, a: IntakeAnswers) => boolean;
}

const BANK: QuestionDef[] = [
  {
    id: "sea_type",
    text: "¿Qué tipo de mar preferís?",
    options: [
      { value: "calm", label: "Mar calmo y transparente" },
      { value: "waves", label: "Con olas, para surfear o barrenar" },
      { value: "any", label: "Me da igual" },
    ],
    impact: 0.8,
    when: (p) => (p.interests.beach ?? 0) >= 0.5,
  },
  {
    id: "all_inclusive",
    text: "¿Te interesa un resort all-inclusive?",
    hint: "Simplifica el viaje, aunque te mueve menos por fuera del hotel.",
    options: [
      { value: "yes", label: "Sí, quiero olvidarme de todo" },
      { value: "no", label: "No, prefiero salir a comer afuera" },
      { value: "any", label: "Me da igual" },
    ],
    impact: 0.6,
    when: (p, a) => (p.interests.beach ?? 0) >= 0.5 && !a.stay.lodgingTypes.includes("all_inclusive"),
  },
  {
    id: "beach_vibe",
    text: "En la playa, ¿buscás tranquilidad o actividades?",
    options: [
      { value: "quiet", label: "Tranquilidad absoluta" },
      { value: "activities", label: "Actividades y excursiones" },
      { value: "mix", label: "Una combinación" },
    ],
    impact: 0.5,
    when: (p) => (p.interests.beach ?? 0) >= 0.5,
  },
  {
    id: "depth",
    text: "¿Preferís conocer muchas ciudades o profundizar en menos destinos?",
    options: [
      { value: "many", label: "Muchas ciudades, aunque sea poco tiempo en cada una" },
      { value: "few", label: "Menos destinos, con más tiempo en cada uno" },
      { value: "balanced", label: "Un equilibrio" },
    ],
    impact: 0.9,
    when: (p) => p.shape !== "single" && (p.nights ?? 10) >= 8,
  },
  {
    id: "euro_interests",
    text: "¿Qué te interesa más de las ciudades?",
    multi: true,
    options: [
      { value: "history", label: "Historia" },
      { value: "gastronomy", label: "Gastronomía" },
      { value: "nature", label: "Naturaleza cercana" },
      { value: "nightlife", label: "Vida nocturna" },
      { value: "architecture", label: "Arquitectura" },
      { value: "shopping", label: "Compras" },
    ],
    impact: 0.6,
    when: (p) => p.shape !== "single" && Object.keys(p.interests).length < 4,
  },
  {
    id: "long_trains",
    text: "¿Te sentís cómodo con trayectos largos en tren (5 horas o más)?",
    options: [
      { value: "yes", label: "Sí, me gusta ver el paisaje" },
      { value: "no", label: "Prefiero un vuelo corto si ahorra tiempo" },
    ],
    impact: 0.4,
    when: (p) => p.shape !== "single" && (p.wishRegions.includes("europa") || p.wishRegions.includes("japon")),
  },
  {
    id: "include_known",
    text: "¿Querés incluir alguna ciudad que ya conocés si realmente vale la pena?",
    options: [
      { value: "yes", label: "Sí, si encaja bien en la ruta" },
      { value: "no", label: "No, solo lugares nuevos" },
    ],
    impact: 0.7,
    when: (p) => p.visitedIds.length > 0,
  },
  {
    id: "kid_interests",
    text: "¿Qué actividades disfrutan más los chicos?",
    multi: true,
    options: [
      { value: "themeparks", label: "Parques temáticos" },
      { value: "beach", label: "Playa y pileta" },
      { value: "nature", label: "Animales y naturaleza" },
      { value: "culture", label: "Museos interactivos" },
      { value: "adventure", label: "Aventura" },
    ],
    impact: 0.7,
    when: (p) => p.kids.length > 0,
  },
  {
    id: "reduce_walking",
    text: "¿Necesitás reducir caminatas o traslados largos?",
    options: [
      { value: "yes", label: "Sí, cuanto menos, mejor" },
      { value: "no", label: "No, estamos acostumbrados" },
    ],
    impact: 0.6,
    when: (p) => (p.kids.some((k) => k < 7) || p.partyType === "family") && !p.reducedMobility,
  },
  {
    id: "romantic_setting",
    text: "¿Qué escenario imaginás para este viaje?",
    options: [
      { value: "beach", label: "Playa" },
      { value: "mountain", label: "Montaña y naturaleza" },
      { value: "villages", label: "Pueblos con encanto" },
      { value: "cities", label: "Ciudades" },
      { value: "mix", label: "Una combinación" },
    ],
    impact: 0.9,
    when: (p, a) => a.tripStyles.some((s) => s === "romantic" || s === "honeymoon") && !p.wishIds.length && !p.wishRegions.length,
  },
  {
    id: "romantic_focus",
    text: "¿Buscás experiencias especiales o principalmente descanso?",
    options: [
      { value: "experiences", label: "Experiencias especiales" },
      { value: "rest", label: "Descanso" },
      { value: "both", label: "Las dos cosas" },
    ],
    impact: 0.4,
    when: (p, a) => a.tripStyles.some((s) => s === "romantic" || s === "honeymoon"),
  },
  {
    id: "continents",
    text: "¿Qué regiones te tientan? (podés elegir varias)",
    multi: true,
    options: [
      { value: "caribe", label: "Caribe" },
      { value: "brasil", label: "Brasil" },
      { value: "europa", label: "Europa" },
      { value: "usa", label: "Estados Unidos" },
      { value: "argentina", label: "Argentina" },
      { value: "sudamerica", label: "Sudamérica" },
      { value: "japon", label: "Japón" },
      { value: "sudeste-asiatico", label: "Sudeste asiático" },
    ],
    impact: 0.8,
    when: (p, a) => (a.tripStyles.includes("discover") || !a.tripStyles.length) && !p.wishIds.length && !p.wishRegions.length,
  },
  {
    id: "physical_level",
    text: "¿Qué nivel de esfuerzo físico te resulta cómodo?",
    options: [
      { value: "soft", label: "Suave: caminatas cortas" },
      { value: "moderate", label: "Moderado" },
      { value: "hard", label: "Exigente: trekking y aventura" },
    ],
    impact: 0.6,
    when: (p) => (p.interests.nature ?? 0) >= 0.7 || (p.interests.adventure ?? 0) >= 0.7,
  },
];

/**
 * Selecciona hasta `max` preguntas que pueden cambiar sustancialmente la recomendación.
 * No repite lo que ya fue respondido.
 */
export function pickSmartQuestions(profile: TravelerProfile, answers: IntakeAnswers, max = 4): SmartQuestion[] {
  return BANK.filter((q) => answers.extra?.[q.id] === undefined && q.when(profile, answers))
    .sort((a, b) => b.impact - a.impact)
    .slice(0, max)
    .map(({ when: _when, ...q }) => q);
}

export const SMART_QUESTION_IDS = BANK.map((q) => q.id);
