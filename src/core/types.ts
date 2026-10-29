/**
 * Tipos del dominio de VIORA TRAVEL.
 *
 * Regla: nada de lo definido en este archivo contiene importes. Los montos
 * (presupuesto declarado, cotizaciones, tarifas) viven exclusivamente en el
 * módulo `pricing` y en el esquema `internal` de la base de datos.
 */

// ───────────────────────── Control de información ─────────────────────────

export const VERIFICATION_STATUSES = [
  "verified_current",
  "official_general",
  "estimate",
  "ai_recommendation",
  "pending",
  "unavailable",
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  verified_current: "Verificado en fuente actual",
  official_general: "Información oficial general",
  estimate: "Estimación",
  ai_recommendation: "Recomendación del sistema",
  pending: "Pendiente de confirmar",
  unavailable: "No disponible",
};

export interface SourceRef {
  label: string;
  url?: string;
  checkedAt?: string; // ISO
}

export interface Claim<T> {
  value: T;
  status: VerificationStatus;
  sources?: SourceRef[];
  checkedAt?: string;
  validUntil?: string;
  note?: string;
}

// ───────────────────────── Catálogos ─────────────────────────

export const INTERESTS = [
  "beach",
  "relax",
  "culture",
  "history",
  "architecture",
  "gastronomy",
  "nature",
  "adventure",
  "nightlife",
  "shopping",
  "romance",
  "family",
  "themeparks",
  "iconic",
  "offbeat",
  "luxury",
  "wellness",
  "wine",
] as const;
export type Interest = (typeof INTERESTS)[number];
export type InterestVector = Partial<Record<Interest, number>>;

export const TRIP_STYLES = [
  "beach_relax",
  "eurotrip",
  "big_cities",
  "nature_adventure",
  "romantic",
  "honeymoon",
  "family",
  "theme_parks",
  "culture_history",
  "gastronomy",
  "luxury",
  "backpacker",
  "cruise",
  "shopping",
  "exotic",
  "road_trip",
  "mixed",
  "discover",
] as const;
export type TripStyle = (typeof TRIP_STYLES)[number];

export const PRIORITIES = [
  "rest",
  "many_places",
  "few_hotel_changes",
  "eat_well",
  "quiet_beaches",
  "historic_sites",
  "nightlife",
  "shopping",
  "authentic",
  "comfort",
  "optimize_budget",
  "avoid_crowds",
  "landscapes",
  "free_time",
  "famous_sights",
  "central_lodging",
  "slow_pace",
] as const;
export type Priority = (typeof PRIORITIES)[number];

export const BUDGET_TIERS = ["backpacker", "economic", "moderate", "comfort", "premium", "unlimited"] as const;
export type BudgetTier = (typeof BUDGET_TIERS)[number];

export const LODGING_TYPES = [
  "hostel",
  "budget_hotel",
  "mid_hotel",
  "upscale_hotel",
  "all_inclusive",
  "boutique",
  "apartment",
  "rural",
  "luxury",
] as const;
export type LodgingType = (typeof LODGING_TYPES)[number];

export const TRANSPORT_MODES = ["plane", "train", "bus", "car", "private_transfer", "public_transport", "ferry"] as const;
export type TransportMode = (typeof TRANSPORT_MODES)[number];

export type Pace = "relaxed" | "balanced" | "intense";
export type PartyType = "solo" | "couple" | "friends" | "family" | "group" | "other";

// ───────────────────────── Cuestionario ─────────────────────────

export interface IntakeAnswers {
  tripStyles: TripStyle[];
  dreamText?: string;
  dates: {
    mode: "exact" | "month" | "unknown";
    departure?: string; // YYYY-MM-DD
    return?: string; // YYYY-MM-DD
    months?: number[]; // 1..12
    year?: number;
    flexibilityDays?: number;
    nights?: number;
    canExtend?: boolean;
    canShorten?: boolean;
  };
  origin: {
    city: string;
    country: string;
    airport?: string;
    /** Coordenadas del aeropuerto elegido en el buscador (para estimar tiempos de vuelo). */
    lat?: number;
    lng?: number;
    altAirportOk?: boolean;
    flightPref?: "direct" | "few_stops" | "any";
    longLayoverOk?: boolean;
    overnightOk?: boolean;
  };
  party: {
    type: PartyType;
    adults: number;
    childrenAges: number[];
    mobility?: "none" | "reduced" | "wheelchair";
    accessibilityNotes?: string;
  };
  budget: {
    tier: BudgetTier;
    per?: "person" | "group";
    includes?: Partial<Record<"flights" | "lodging" | "meals" | "activities" | "transport" | "insurance", boolean>>;
    flexibility?: "none" | "some" | "high";
  };
  priorities: {
    selected: Priority[];
    ranking: Priority[];
    mustHave: Priority[];
  };
  history: {
    visited: string[];
    loved: string[];
    wouldNotReturn: string[];
    pending: string[];
    avoid: string[];
    repeatExperiences?: string;
  };
  stay: {
    lodgingTypes: LodgingType[];
    transport: TransportMode[];
    lodgingPriority?: "price" | "location" | "comfort" | "views" | "services" | "experience";
    noCarRental?: boolean;
  };
  extra: Record<string, string | string[]>;
}

// ───────────────────────── Biblioteca de destinos ─────────────────────────

export type DestinationKind = "city" | "beach" | "nature" | "resort" | "themepark" | "island";

export interface LibraryActivity {
  id: string;
  name: string;
  kind: "sight" | "museum" | "tour" | "daytrip" | "beach" | "nature" | "food" | "experience" | "park" | "nightlife" | "shopping";
  hours: number;
  effort: 1 | 2 | 3;
  booking: "required" | "recommended" | "no";
  indoor?: boolean;
  tags: Interest[];
  months?: number[]; // si es estacional
  kidsOk?: boolean;
  url?: string; // sitio oficial
  note?: string;
}

export interface Destination {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  cluster: string; // agrupación geográfica para armar rutas
  kind: DestinationKind;
  lat: number;
  lng: number;
  airports: string[];
  tags: InterestVector; // 0..3
  nights: { min: number; ideal: number; max: number };
  costLevel: 1 | 2 | 3 | 4 | 5;
  tranquility: 1 | 2 | 3 | 4 | 5;
  familyFit: 1 | 2 | 3;
  walking: 1 | 2 | 3;
  climate: {
    hi: number[]; // máxima media aproximada por mes (°C)
    rain: (0 | 1 | 2 | 3)[]; // 0 seco … 3 muy lluvioso
    sea?: number[]; // temperatura del mar aproximada (°C)
  };
  /** `level: "low"` marca riesgos registrados pero históricamente poco probables (no excluyen el destino). */
  risks?: { months: number[]; kind: "hurricane" | "monsoon" | "heat" | "cold" | "crowds" | "closures" | "sargassum" | "altitude"; note: string; level?: "low" }[];
  highSeason?: number[];
  beach?: { clarity: 1 | 2 | 3; calm: 1 | 2 | 3 }; // agua: claridad habitual y mar calmo (referencia, no garantía)
  summary: string;
  idealFor: string;
  food: string[];
  lodgingZones: { name: string; profile: string }[];
  highlights: LibraryActivity[];
  tourismUrl?: string;
  imageQuery: string;
  /** Lugares emblemáticos (títulos de artículos de Wikipedia en inglés) para buscar fotos características. */
  photoSpots?: string[];
  firstTimerFriendly?: boolean;
}

export interface KnownConnection {
  a: string;
  b: string;
  mode: TransportMode;
  hours: number;
  operators: { name: string; url: string }[];
  note?: string;
}

// ───────────────────────── Perfil del viajero ─────────────────────────

export interface InferredItem {
  key: string;
  label: string;
  value: string;
  rationale: string;
  confidence: "low" | "medium" | "high";
  by: "rules" | "ai";
}

export interface MissingItem {
  key: string;
  label: string;
  impact: "high" | "medium" | "low";
}

export interface TravelerProfile {
  declared: { label: string; value: string }[];
  inferred: InferredItem[];
  missing: MissingItem[];
  interests: InterestVector; // 0..1
  pace: Pace;
  shape: "single" | "multi" | "open";
  nights: number | null;
  months: number[];
  exploratory: boolean; // sin fechas confirmadas
  flexibleDays: number;
  kids: number[];
  reducedMobility: boolean;
  budgetTier: BudgetTier;
  visitedIds: string[];
  visitedCountries: string[]; // países declarados como conocidos (códigos ISO)
  excludedIds: string[];
  lovedIds: string[];
  pendingIds: string[];
  firstTimeEurope: boolean;
  avoidHotelChanges: boolean;
  noCar: boolean;
  mustHave: Priority[];
  priorities: Priority[];
  partyType: PartyType;
  travelers: number;
  originLabel: string;
  originCoords: { lat: number; lng: number } | null;
  originAirports: string[];
  wishIds: string[]; // destinos mencionados o pendientes
  wishRegions: string[]; // superregiones deseadas
  /** Países pedidos explícitamente («21 días en Italia»): las alternativas se limitan a ellos. */
  wishCountries?: string[];
  /** Intereses que la persona repitió en varias respuestas (estilo, prioridades, juego, texto): mandan en la recomendación. */
  strongIntents?: Interest[];
  /** Experiencias concretas pedidas (trekking, buceo, vinos…): ver core/experiences. */
  experiences?: string[];
  effortCap: 1 | 2 | 3;
  includeKnown: boolean;
  preferFlightsOverLongTrains: boolean;
  allInclusive: "yes" | "no" | "any";
  beachPrefs: { clearWater: boolean; calmSea: boolean; waves: boolean };
}

// ───────────────────────── Evaluación ─────────────────────────

export const CRITERIA = [
  "affinity",
  "dates",
  "climate",
  "logistics",
  "budget",
  "travelTime",
  "pace",
  "experiences",
  "group",
  "risks",
] as const;
export type Criterion = (typeof CRITERIA)[number];

export const CRITERIA_LABELS: Record<Criterion, string> = {
  affinity: "Afinidad con tus intereses",
  dates: "Adecuación a las fechas",
  climate: "Viabilidad climática",
  logistics: "Logística",
  budget: "Adecuación al presupuesto",
  travelTime: "Tiempo de traslado",
  pace: "Ritmo del viaje",
  experiences: "Experiencias disponibles",
  group: "Compatibilidad con el grupo",
  risks: "Riesgos y limitaciones",
};

export interface CriterionScore {
  value: number; // 0..10
  weight: number;
  factors: { sign: "+" | "-"; text: string }[];
}

// ───────────────────────── Documento de plan ─────────────────────────

export type ItemOrigin = "engine" | "ai" | "agent" | "client_request";

export interface Editable {
  id: string;
  origin: ItemOrigin;
  locked?: boolean; // editado por el agente: la IA/motor no lo sobrescribe
}

export interface PlanStop extends Editable {
  destinationId: string | null; // null = cargado manualmente fuera de biblioteca
  name: string;
  country: string;
  lat: number | null;
  lng: number | null;
  nights: number;
  lodgingZone?: string;
  arrivalDate?: string;
  departureDate?: string;
}

export interface PlanLeg extends Editable {
  fromStopId: string | "origin";
  toStopId: string | "origin";
  fromName: string;
  toName: string;
  mode: TransportMode;
  duration: Claim<number | null>; // horas
  operators: { name: string; url: string }[];
  distanceKm: number | null;
  date?: string;
  notes?: string;
}

export interface PlanActivity extends Editable {
  name: string;
  why: string;
  hours: number;
  where: string;
  booking: "required" | "recommended" | "no";
  seasonal?: string;
  effort: 1 | 2 | 3;
  indoor?: boolean;
  url?: string;
  alternatives?: string;
  /** Día completo en un parque temático (para no encadenar demasiados seguidos). */
  themePark?: boolean;
}

export interface PlanDay extends Editable {
  n: number;
  date?: string;
  stopId: string;
  title: string;
  kind: "arrival" | "full" | "transfer" | "departure" | "rest";
  activities: PlanActivity[];
  food?: string;
  freeTime: string;
  rainPlan?: string;
  effort: 1 | 2 | 3;
  logistics?: string;
}

export interface LodgingSuggestion extends Editable {
  stopId: string;
  category: string;
  zone: string;
  zoneProfile: string;
  why: string;
  options: {
    id: string;
    name: string;
    location?: string;
    url?: string;
    source?: string;
    pros?: string;
    cons?: string;
    toConfirm: string[];
    origin: ItemOrigin;
  }[];
}

export interface Alternative {
  id: string;
  title: string;
  kind: "single" | "route";
  stops: { destinationId: string; name: string; country: string; nights: number }[];
  summary: string;
  mainReason: string;
  idealTraveler: string;
  pros: string[];
  cons: string[];
  scores: Record<Criterion, CriterionScore>;
  compatibility: number; // 0..100
  labels: string[];
  climateNote: Claim<string>;
  travelFromOrigin: Claim<number | null>; // horas aprox.
  logisticsComplexity: "baja" | "media" | "alta";
  lodgingChanges: number;
  tranquility: "alta" | "media" | "baja";
  experienceType: string;
  activities: string[];
  warnings: string[];
  imageQuery: string;
  entryChecks: { label: string; url?: string }[];
}

export interface SeasonWindow {
  month: number;
  label: string;
  climateScore: number;
  notes: string[];
  hypothesis: string; // siempre rotulado como hipótesis a investigar
}

export interface ValidationIssue {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
  refs?: string[];
}

export interface PlanDocument {
  schemaVersion: 1;
  generatedAt: string;
  engine: { kind: "rules" | "rules+ai"; model?: string };
  title: string;
  concept: string;
  profile: TravelerProfile;
  weights: Record<Criterion, number>;
  weightNotes: string[];
  alternatives: Alternative[];
  seasonal: { alternativeId: string; windows: SeasonWindow[] }[];
  selectedAlternativeId: string | null;
  itinerary: {
    alternativeId: string;
    startDate?: string;
    stops: PlanStop[];
    legs: PlanLeg[];
    days: PlanDay[];
    lodging: LodgingSuggestion[];
    flights: {
      originAirports: string[];
      destinationAirports: string[];
      returnAirports: string[];
      notes: string[];
      searchLinks: { label: string; url: string }[];
    };
  } | null;
  recommendations: string[];
  checks: ValidationIssue[];
  /** Gastos diarios orientativos por parada (referencia de la agencia, sin alojamiento ni vuelos). */
  dailySpend?: { stopId: string; name: string; nights: number; low: number; high: number; currency: "USD" | "EUR" }[];
  /** Costo aproximado por persona (vuelos + alojamiento + traslados), estimación de referencia. */
  tripEstimate?: import("./trip-estimate").TripEstimate | null;
  pendingInfo: string[];
  entryRequirements: { country: string; items: Claim<string>[]; links: { label: string; url: string }[] }[];
}
