import type { Claim, Destination, KnownConnection, TransportMode } from "./types";

const R = 6371;

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Clusters con red ferroviaria densa donde el tren suele ser la mejor opción en distancias medias. */
const RAIL_CLUSTERS = new Set(["iberia", "europa-occidental", "europa-central", "italia", "japon"]);

export interface LegEstimate {
  mode: TransportMode;
  duration: Claim<number | null>;
  distanceKm: number;
  operators: { name: string; url: string }[];
  note?: string;
}

/**
 * Estima el traslado entre dos destinos. Si hay una conexión conocida, la usa
 * (como estimación de referencia); si no, estima por distancia y la marca como
 * pendiente de validación. Nunca afirma que exista un servicio concreto.
 */
export function estimateLeg(
  from: Destination,
  to: Destination,
  connections: KnownConnection[],
  opts: { preferFlights?: boolean; noCar?: boolean } = {},
): LegEstimate {
  const distanceKm = Math.round(haversineKm(from, to));
  const known = connections.find((c) => (c.a === from.id && c.b === to.id) || (c.a === to.id && c.b === from.id));
  if (known && !(opts.preferFlights && known.mode === "train" && known.hours > 5)) {
    return {
      mode: known.mode,
      distanceKm,
      operators: known.operators,
      note: known.note,
      duration: {
        value: known.hours,
        status: "estimate",
        note: "Duración habitual de referencia. Verificar horarios y frecuencias con el operador.",
        sources: known.operators.map((o) => ({ label: o.name, url: o.url })),
      },
    };
  }
  const rail = RAIL_CLUSTERS.has(from.cluster) && RAIL_CLUSTERS.has(to.cluster);
  let mode: TransportMode;
  let hours: number;
  if (distanceKm < 250 && !opts.noCar) {
    mode = rail ? "train" : "car";
    hours = distanceKm / 75 + 0.5;
  } else if (rail && distanceKm < 650 && !opts.preferFlights) {
    mode = "train";
    hours = distanceKm / 120 + 0.5;
  } else if (distanceKm < 350) {
    mode = "bus";
    hours = distanceKm / 65 + 0.5;
  } else {
    mode = "plane";
    hours = distanceKm / 700 + 3; // incluye traslados y tiempos de aeropuerto
  }
  return {
    mode,
    distanceKm,
    operators: [],
    duration: {
      value: Math.round(hours * 4) / 4,
      status: "pending",
      note: "Estimación por distancia. Conexión pendiente de validación: no se verificó que exista un servicio directo.",
    },
  };
}

/** Horas aproximadas de viaje desde el origen (puerta a puerta, con conexiones típicas). */
export function estimateLongHaulHours(origin: { lat: number; lng: number }, dest: { lat: number; lng: number }): number {
  const km = haversineKm(origin, dest);
  if (km < 300) return Math.round((km / 80 + 0.5) * 2) / 2;
  let hours = km / 780 + 2.5;
  if (km > 4000) hours += 2; // escala probable
  if (km > 11000) hours += 3; // dos escalas o escala larga probable
  return Math.round(hours * 2) / 2;
}

/** Ordena paradas minimizando la distancia total (ruta abierta). Exacto hasta 8 paradas. */
export function bestOrder<T extends { lat: number; lng: number }>(points: T[], start?: { lat: number; lng: number }): T[] {
  if (points.length <= 2) {
    if (points.length === 2 && start && haversineKm(start, points[1]) < haversineKm(start, points[0])) return [points[1], points[0]];
    return points.slice();
  }
  const n = points.length;
  const dist = points.map((p) => points.map((q) => haversineKm(p, q)));
  let best: number[] = [];
  let bestCost = Infinity;
  const used = new Array(n).fill(false);
  const path: number[] = [];
  const startCost = (i: number) => (start ? haversineKm(start, points[i]) * 0.05 : 0); // leve preferencia por entrar cerca del origen
  function rec(cost: number) {
    if (cost >= bestCost) return;
    if (path.length === n) {
      bestCost = cost;
      best = path.slice();
      return;
    }
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      const add = path.length === 0 ? startCost(i) : dist[path[path.length - 1]][i];
      used[i] = true;
      path.push(i);
      rec(cost + add);
      path.pop();
      used[i] = false;
    }
  }
  rec(0);
  return best.map((i) => points[i]);
}

export function routeLengthKm(points: { lat: number; lng: number }[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += haversineKm(points[i - 1], points[i]);
  return total;
}
