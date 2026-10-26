import { allocateNights } from "./nights";
import { joinNames, refreshDerived, type PlanContext } from "./plan";
import { buildItinerary } from "./itinerary";
import { affinityOf } from "./scoring";
import { matchDestinations, normalize } from "./text";
import type { Destination, IntakeAnswers, Pace, PlanDocument } from "./types";

export type ChangeOp =
  | { op: "remove_stop"; stopId: string }
  | { op: "add_stop"; destinationId: string; afterStopId?: string }
  | { op: "replace_stop"; stopId: string; destinationId: string }
  | { op: "set_nights"; stopId: string; nights: number }
  | { op: "reorder"; stopIds: string[] }
  | { op: "set_pace"; pace: Pace }
  | { op: "more_nights_kind"; kind: "beach"; extra: number }
  | { op: "central_lodging" }
  | { op: "no_car" }
  | { op: "recompute_alternatives"; focus: "cheaper" };

export interface ParsedChange {
  ops: ChangeOp[];
  explanation: string[];
  conflicts: string[]; // afectan elementos bloqueados por el agente: requieren aprobación
  unmatched: boolean;
}

/** Interpreta pedidos de cambio frecuentes con reglas (funciona sin IA). */
export function parseChangeRequest(text: string, doc: PlanDocument, library: Destination[]): ParsedChange {
  const t = normalize(text);
  const it = doc.itinerary;
  const ops: ChangeOp[] = [];
  const explanation: string[] = [];
  const conflicts: string[] = [];
  if (!it) return { ops, explanation: ["Todavía no hay un itinerario para modificar."], conflicts, unmatched: true };
  const stopByDest = (id: string) => it.stops.find((s) => s.destinationId === id);

  const replace = t.match(/(?:cambiar|cambia|reemplazar|reemplaza)\s+(.+?)\s+por\s+(.+)/);
  if (replace) {
    const from = matchDestinations(replace[1], library)[0];
    const to = matchDestinations(replace[2], library)[0];
    const stop = from ? stopByDest(from) : undefined;
    if (stop && to) {
      if (stop.locked) conflicts.push(`${stop.name} fue fijada por un agente.`);
      else {
        ops.push({ op: "replace_stop", stopId: stop.id, destinationId: to });
        explanation.push(`Se reemplaza ${stop.name} por ${library.find((d) => d.id === to)?.name}, manteniendo el resto de la ruta.`);
      }
    }
  }
  if (/menos ciudades|menos destinos|menos lugares/.test(t) && it.stops.length > 1) {
    const candidates = it.stops.filter((s) => !s.locked);
    const worst = candidates
      .map((s) => ({ s, a: affinityOf(library.find((d) => d.id === s.destinationId)!, doc.profile) }))
      .sort((x, y) => x.a - y.a)[0];
    if (worst) {
      ops.push({ op: "remove_stop", stopId: worst.s.id });
      explanation.push(`Se quita ${worst.s.name} (la de menor afinidad con tu perfil) y sus noches se reparten en el resto.`);
    } else conflicts.push("Todas las paradas fueron fijadas por un agente.");
  }
  const removeM = t.match(/(?:sacar|saca|quitar|quita|eliminar|elimina|sin)\s+(.+)/);
  if (removeM && !replace && !/auto/.test(removeM[1])) {
    for (const id of matchDestinations(removeM[1], library)) {
      const stop = stopByDest(id);
      if (!stop) continue;
      if (stop.locked) conflicts.push(`${stop.name} fue fijada por un agente.`);
      else {
        ops.push({ op: "remove_stop", stopId: stop.id });
        explanation.push(`Se quita ${stop.name}.`);
      }
    }
  }
  const addM = t.match(/(?:agregar|agrega|sumar|suma|incluir|inclui|anadir)\s+(.+)/);
  if (addM && !replace) {
    for (const id of matchDestinations(addM[1], library)) {
      if (stopByDest(id)) continue;
      ops.push({ op: "add_stop", destinationId: id });
      explanation.push(`Se incorpora ${library.find((d) => d.id === id)?.name} en la posición más coherente de la ruta.`);
    }
  }
  if (/mas dias de playa|mas playa/.test(t)) {
    ops.push({ op: "more_nights_kind", kind: "beach", extra: 2 });
    explanation.push("Se suman noches en los destinos de playa, restándolas de las otras paradas.");
  }
  if (/mas tranquilo|mas relajado|ritmo tranquilo|menos agotador|mas lento/.test(t)) {
    ops.push({ op: "set_pace", pace: "relaxed" });
    explanation.push("Se recalculan los días con un ritmo más tranquilo y más tiempo libre.");
  }
  if (/mas intenso|aprovechar mas|mas actividades/.test(t)) {
    ops.push({ op: "set_pace", pace: "intense" });
    explanation.push("Se recalculan los días con más actividades.");
  }
  if (/centric/.test(t)) {
    ops.push({ op: "central_lodging" });
    explanation.push("Se sugieren zonas de alojamiento céntricas en cada parada.");
  }
  if (/no quiero (alquilar )?auto|sin auto|no manejar/.test(t)) {
    ops.push({ op: "no_car" });
    explanation.push("Se descartan traslados en auto alquilado.");
  }
  if (/mas economic|mas barat|menor presupuesto|gastar menos/.test(t)) {
    ops.push({ op: "recompute_alternatives", focus: "cheaper" });
    explanation.push("Se buscan alternativas con mayor afinidad con el presupuesto (se recalculan las tres opciones).");
  }
  return { ops, explanation, conflicts, unmatched: ops.length === 0 && conflicts.length === 0 };
}

/**
 * Aplica operaciones al documento (en una copia). Conserva todo lo no afectado y los
 * elementos bloqueados por el agente. Devuelve un documento nuevo (nueva versión).
 */
export function applyChanges(docIn: PlanDocument, ops: ChangeOp[], answers: IntakeAnswers, ctx: PlanContext): PlanDocument {
  const doc: PlanDocument = structuredClone(docIn);
  const it = doc.itinerary;
  if (!it) return doc;
  const lib = (id: string | null) => ctx.library.find((d) => d.id === id);
  type S = { dest: Destination; nights: number; stopId?: string; locked?: boolean; fixed?: boolean; lodgingZone?: string };
  let stops: S[] = it.stops.filter((s) => lib(s.destinationId)).map((s) => ({ dest: lib(s.destinationId)!, nights: s.nights, stopId: s.id, locked: s.locked, fixed: true, lodgingZone: s.lodgingZone }));
  const total = stops.reduce((a, s) => a + s.nights, 0);
  let stopsChanged = false;

  for (const op of ops) {
    switch (op.op) {
      case "remove_stop":
        stops = stops.filter((s) => s.stopId !== op.stopId);
        stops.forEach((s) => !s.locked && (s.fixed = false));
        stopsChanged = true;
        break;
      case "replace_stop": {
        const d = lib(op.destinationId);
        const i = stops.findIndex((s) => s.stopId === op.stopId);
        if (d && i >= 0) {
          stops[i] = { dest: d, nights: stops[i].nights, fixed: true };
          stopsChanged = true;
        }
        break;
      }
      case "add_stop": {
        const d = lib(op.destinationId);
        if (!d) break;
        // Posición más coherente: la que menos alarga la ruta.
        let bestIdx = stops.length;
        let bestCost = Infinity;
        for (let i = 0; i <= stops.length; i++) {
          const prev = stops[i - 1]?.dest;
          const next = stops[i]?.dest;
          const dist = (a?: Destination, b?: Destination) => (a && b ? Math.hypot(a.lat - b.lat, a.lng - b.lng) : 0);
          const cost = dist(prev, d) + dist(d, next) - dist(prev, next);
          if (cost < bestCost) {
            bestCost = cost;
            bestIdx = i;
          }
        }
        stops.splice(bestIdx, 0, { dest: d, nights: d.nights.min, fixed: false });
        stops.forEach((s) => !s.locked && (s.fixed = false));
        stopsChanged = true;
        break;
      }
      case "set_nights": {
        const s = stops.find((x) => x.stopId === op.stopId);
        if (s) {
          s.nights = Math.max(1, op.nights);
          s.fixed = true;
          s.locked = true;
          stops.forEach((x) => x !== s && !x.locked && (x.fixed = false));
          stopsChanged = true;
        }
        break;
      }
      case "reorder": {
        const order = new Map(op.stopIds.map((id, i) => [id, i]));
        stops.sort((a, b) => (order.get(a.stopId ?? "") ?? 99) - (order.get(b.stopId ?? "") ?? 99));
        stopsChanged = true;
        break;
      }
      case "more_nights_kind": {
        const beach = stops.filter((s) => ["beach", "island", "resort"].includes(s.dest.kind));
        if (!beach.length) break;
        beach[0].nights += op.extra;
        beach[0].fixed = true;
        stops.forEach((x) => !beach.includes(x) && !x.locked && (x.fixed = false));
        stopsChanged = true;
        break;
      }
      case "set_pace":
        doc.profile.pace = op.pace;
        break;
      case "central_lodging":
        doc.profile.priorities = [...new Set([...doc.profile.priorities, "central_lodging" as const])];
        stops.forEach((s) => (s.lodgingZone = s.dest.lodgingZones[0]?.name));
        break;
      case "no_car":
        doc.profile.noCar = true;
        break;
      case "recompute_alternatives":
        break; // lo resuelve el servicio regenerando alternativas con más peso en presupuesto
    }
  }

  if (stopsChanged) {
    const alloc = allocateNights(
      stops.map((s) => ({ dest: s.dest, weight: affinityOf(s.dest, doc.profile), fixed: s.fixed ? s.nights : undefined })),
      total,
      doc.profile.pace,
    );
    stops = stops.filter((s) => alloc.kept.includes(s.dest.id)).map((s, i) => ({ ...s, nights: alloc.nights[i] }));
  }
  const startDate = answers.dates.mode === "exact" ? answers.dates.departure : undefined;
  doc.itinerary = buildItinerary(
    it.alternativeId,
    stops.map((s) => ({ dest: s.dest, nights: s.nights, stopId: s.stopId, locked: s.locked, lodgingZone: s.lodgingZone })),
    doc.profile,
    ctx.connections,
    { startDate, previous: it },
  );
  const alt = doc.alternatives.find((a) => a.id === it.alternativeId);
  if (alt && stopsChanged) {
    alt.stops = stops.map((s) => ({ destinationId: s.dest.id, name: s.dest.name, country: s.dest.country, nights: s.nights }));
    alt.title = joinNames(alt.stops.map((s) => s.name));
    alt.lodgingChanges = alt.stops.length - 1;
  }
  refreshDerived(doc, ctx);
  return doc;
}
