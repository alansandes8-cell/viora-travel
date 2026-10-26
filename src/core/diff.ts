import type { PlanDocument } from "./types";

/** Diferencias legibles entre dos versiones del plan (para el historial y la comparación). */
export function diffPlans(a: PlanDocument, b: PlanDocument): string[] {
  const out: string[] = [];
  if (a.title !== b.title) out.push(`Título: «${a.title}» → «${b.title}»`);
  if (a.concept !== b.concept) out.push("Cambió el concepto del viaje.");
  const altA = a.alternatives.map((x) => x.title).join(" | ");
  const altB = b.alternatives.map((x) => x.title).join(" | ");
  if (altA !== altB) out.push(`Alternativas: ${altA} → ${altB}`);
  const selA = a.alternatives.find((x) => x.id === a.selectedAlternativeId)?.title;
  const selB = b.alternatives.find((x) => x.id === b.selectedAlternativeId)?.title;
  if (selA !== selB) out.push(`Alternativa elegida: ${selA ?? "—"} → ${selB ?? "—"}`);
  const ia = a.itinerary;
  const ib = b.itinerary;
  if (!ia || !ib) return out;
  const stopsA = ia.stops.map((s) => `${s.name} (${s.nights})`).join(" → ");
  const stopsB = ib.stops.map((s) => `${s.name} (${s.nights})`).join(" → ");
  if (stopsA !== stopsB) out.push(`Ruta: ${stopsA} ⟶ ${stopsB}`);
  const actsA = new Set(ia.days.flatMap((d) => d.activities.map((x) => x.name)));
  const actsB = new Set(ib.days.flatMap((d) => d.activities.map((x) => x.name)));
  const added = [...actsB].filter((x) => !actsA.has(x));
  const removed = [...actsA].filter((x) => !actsB.has(x));
  if (added.length) out.push(`Actividades agregadas: ${added.join(", ")}`);
  if (removed.length) out.push(`Actividades quitadas: ${removed.join(", ")}`);
  for (const lb of ib.lodging) {
    const la = ia.lodging.find((x) => x.stopId === lb.stopId);
    if (!la) continue;
    if (la.zone !== lb.zone || la.category !== lb.category) out.push(`Alojamiento ${ib.stops.find((s) => s.id === lb.stopId)?.name}: ${la.category} / ${la.zone} → ${lb.category} / ${lb.zone}`);
    if (la.options.length !== lb.options.length) out.push(`Opciones de hotel en ${ib.stops.find((s) => s.id === lb.stopId)?.name}: ${la.options.length} → ${lb.options.length}`);
  }
  if (a.profile.pace !== b.profile.pace) out.push(`Ritmo: ${a.profile.pace} → ${b.profile.pace}`);
  const verA = ia.legs.filter((l) => l.duration.status === "verified_current").length;
  const verB = ib.legs.filter((l) => l.duration.status === "verified_current").length;
  if (verA !== verB) out.push(`Traslados verificados: ${verA} → ${verB}`);
  return out;
}
