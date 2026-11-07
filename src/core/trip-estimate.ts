import { SUPER_REGION } from "./library";
import type { BudgetTier, Destination, PlanDocument, TravelerProfile } from "./types";

/**
 * Costo aproximado del viaje (vuelos + alojamiento + traslados internos), por persona, en dólares.
 * Es una ESTIMACIÓN de referencia con valores promedio de mercado que la agencia ajusta en Ajustes;
 * no es una cotización ni incluye los gastos diarios (que se muestran aparte).
 */
export interface TripEstimateTable {
  /** Vuelo ida y vuelta en clase turista desde Argentina, por persona, según superregión del destino. */
  flights: Record<string, [number, number]>;
  /** Habitación doble por noche según nivel de costo del destino (1 a 5), en nivel «moderado». */
  hotel: [number, number][];
  /** Traslado entre ciudades por persona y por tramo, según medio. */
  legs: Record<string, [number, number]>;
  hotelTier: Record<string, number>;
  flightTier: Record<string, number>;
  /** Meses de temporada alta para quien viaja desde Argentina (vacaciones): se encarecen los vuelos. */
  peakMonths: number[];
  peakFactor: number;
  version?: number;
}

/**
 * Versión de la tabla: si la guardada en Ajustes es anterior, se usan estos valores por defecto
 * (la v1 quedaba por debajo de los precios reales). Al guardar desde Ajustes se marca la vigente.
 */
export const TRIP_ESTIMATE_VERSION = 2;

export const DEFAULT_TRIP_ESTIMATE: TripEstimateTable = {
  version: TRIP_ESTIMATE_VERSION,
  // Con margen hacia arriba: mejor que el presupuesto final quede por debajo de lo estimado.
  flights: {
    argentina: [220, 450],
    sudamerica: [450, 900],
    brasil: [400, 800],
    caribe: [950, 1600],
    mexico: [950, 1600],
    centroamerica: [950, 1600],
    usa: [1000, 1700],
    europa: [1350, 2300],
    "medio-oriente": [1600, 2600],
    japon: [2000, 3300],
    "sudeste-asiatico": [1800, 3000],
    indico: [2000, 3300],
  },
  hotel: [
    [60, 110],
    [85, 150],
    [120, 200],
    [170, 290],
    [240, 420],
  ],
  legs: { train: [50, 160], plane: [110, 260], ferry: [60, 150], bus: [25, 70], car: [80, 190], private_transfer: [80, 190], public_transport: [8, 25] },
  hotelTier: { backpacker: 0.45, economic: 0.75, moderate: 1, comfort: 1.45, premium: 2.1, unlimited: 3.4 },
  flightTier: { backpacker: 0.92, economic: 0.97, moderate: 1, comfort: 1.1, premium: 1.6, unlimited: 3.2 },
  peakMonths: [1, 2, 7, 12],
  peakFactor: 1.3,
};

/** Tabla vigente: la guardada solo si es de la versión actual. */
export function currentTripTable(saved: TripEstimateTable | null | undefined): TripEstimateTable {
  return saved && (saved.version ?? 1) >= TRIP_ESTIMATE_VERSION ? saved : DEFAULT_TRIP_ESTIMATE;
}

export interface TripEstimate {
  currency: "USD";
  travelers: number;
  nights: number;
  includesFlights: boolean;
  flights: [number, number];
  lodging: [number, number];
  transfers: [number, number];
  total: [number, number];
}

const round = (n: number) => (n >= 1000 ? Math.round(n / 50) * 50 : Math.round(n / 10) * 10);
const SOUTHERN_CONE = /argentina|uruguay|paraguay|chile/i;

export function estimateTrip(
  it: NonNullable<PlanDocument["itinerary"]>,
  profile: TravelerProfile,
  library: Destination[],
  table: TripEstimateTable = DEFAULT_TRIP_ESTIMATE,
): TripEstimate | null {
  const stops = it.stops.map((s) => ({ s, d: library.find((x) => x.id === s.destinationId) })).filter((x) => x.d) as { s: (typeof it.stops)[number]; d: Destination }[];
  if (!stops.length) return null;
  const tier: BudgetTier = profile.budgetTier;
  const travelers = Math.max(1, profile.travelers);
  const adults = Math.max(1, travelers - profile.kids.length);
  const rooms = Math.max(1, Math.ceil(adults / 2));

  // Vuelos: según la región más lejana del viaje; solo si sale del Cono Sur (la tabla está pensada desde Argentina).
  const includesFlights = SOUTHERN_CONE.test(profile.originLabel);
  let flights: [number, number] = [0, 0];
  if (includesFlights) {
    const ranges = stops.map(({ d }) => table.flights[SUPER_REGION[d.cluster]] ?? [800, 1500]);
    const base = ranges.reduce((a, b) => (b[1] > a[1] ? b : a));
    const peak = profile.months.some((m) => table.peakMonths.includes(m)) ? table.peakFactor : 1;
    const f = (table.flightTier[tier] ?? 1) * peak;
    flights = [base[0] * f, base[1] * f];
  }

  // Alojamiento: habitación doble según nivel de costo y nivel de viaje elegido, repartida entre los viajeros.
  const hf = table.hotelTier[tier] ?? 1;
  const lodging = stops.reduce<[number, number]>(
    (acc, { s, d }) => {
      const [lo, hi] = table.hotel[Math.min(4, Math.max(0, d.costLevel - 1))] ?? [95, 150];
      return [acc[0] + (lo * hf * s.nights * rooms) / travelers, acc[1] + (hi * hf * s.nights * rooms) / travelers];
    },
    [0, 0],
  );

  const transfers = it.legs.reduce<[number, number]>((acc, l) => {
    const [lo, hi] = table.legs[l.mode] ?? [40, 150];
    return [acc[0] + lo, acc[1] + hi];
  }, [0, 0]);

  const total: [number, number] = [flights[0] + lodging[0] + transfers[0], flights[1] + lodging[1] + transfers[1]];
  const r = (x: [number, number]): [number, number] => [round(x[0]), round(x[1])];
  return {
    currency: "USD",
    travelers,
    nights: stops.reduce((a, { s }) => a + s.nights, 0),
    includesFlights,
    flights: r(flights),
    lodging: r(lodging),
    transfers: r(transfers),
    total: r(total),
  };
}
