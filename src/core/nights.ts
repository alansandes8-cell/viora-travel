import type { Destination, Pace } from "./types";

export interface NightsInput {
  dest: Destination;
  weight: number; // afinidad 0..10
  fixed?: number; // noches fijadas manualmente por el agente
}

export interface NightsResult {
  kept: string[]; // ids de las paradas que quedan, en el mismo orden que `nights`
  nights: number[];
  dropped: string[]; // ids que no entraron por falta de noches
  notes: string[];
}

const PACE_FACTOR: Record<Pace, number> = { relaxed: 1.25, balanced: 1, intense: 0.85 };

/**
 * Reparte noches entre paradas. Determinista:
 * 1) respeta noches fijadas manualmente;
 * 2) asigna mínimos (ajustados por ritmo);
 * 3) si no alcanza, propone quitar la parada de menor afinidad en lugar de comprimir;
 * 4) reparte el resto por valor marginal (afinidad, ideal y máximo de cada destino).
 * Garantiza que la suma sea exactamente `total`.
 */
export function allocateNights(stops: NightsInput[], total: number, pace: Pace): NightsResult {
  const notes: string[] = [];
  const dropped: string[] = [];
  let list = stops.slice();
  const f = PACE_FACTOR[pace];
  const minOf = (s: NightsInput) => s.fixed ?? Math.max(1, Math.round(s.dest.nights.min * (pace === "relaxed" ? 1.2 : 1)));

  while (list.length > 1 && list.reduce((a, s) => a + minOf(s), 0) > total) {
    const removable = list.filter((s) => s.fixed === undefined);
    if (!removable.length) break;
    const worst = removable.reduce((a, b) => (b.weight < a.weight ? b : a));
    list = list.filter((s) => s !== worst);
    dropped.push(worst.dest.id);
    notes.push(`${worst.dest.name} no entra en ${total} noches sin acelerar demasiado el ritmo: se sugiere quitarla.`);
  }

  const nights = list.map((s) => Math.min(minOf(s), total));
  let remaining = total - nights.reduce((a, b) => a + b, 0);
  if (remaining < 0) {
    // Solo puede ocurrir con noches fijas que exceden el total: se recorta de la última no fija.
    for (let i = nights.length - 1; i >= 0 && remaining < 0; i--) {
      if (list[i].fixed !== undefined) continue;
      const cut = Math.min(nights[i] - 1, -remaining);
      nights[i] -= cut;
      remaining += cut;
    }
    if (remaining < 0) notes.push("Las noches fijadas manualmente superan la duración total del viaje.");
  }
  while (remaining > 0) {
    let bestIdx = -1;
    let bestVal = -Infinity;
    list.forEach((s, i) => {
      if (s.fixed !== undefined) return;
      const ideal = s.dest.nights.ideal * f;
      const max = s.dest.nights.max * f;
      const n = nights[i];
      let val = (s.weight + 1) / (n + 1);
      if (n >= ideal) val *= 0.45;
      if (n >= max) val *= 0.15;
      if (val > bestVal) {
        bestVal = val;
        bestIdx = i;
      }
    });
    if (bestIdx === -1) break;
    nights[bestIdx]++;
    remaining--;
  }
  list.forEach((s, i) => {
    if (s.fixed === undefined && nights[i] > s.dest.nights.max * f + 1) {
      notes.push(`${s.dest.name} recibe ${nights[i]} noches, más de lo habitual: ideal para descansar o sumar excursiones.`);
    }
  });
  return { kept: list.map((s) => s.dest.id), nights, dropped, notes };
}
