import type { ClientProposal } from "./sanitize";
import { scanForMoney } from "./sanitize";

/** Resumen breve para WhatsApp. Sin precios (se verifica con el escáner). */
export function whatsappSummary(p: ClientProposal): string {
  const alt = p.alternatives.find((a) => a.id === p.selectedAlternativeId) ?? p.alternatives[0];
  const lines = [`✈ ${p.title}`];
  if (alt) {
    lines.push(`Ruta: ${alt.stops.map((s) => `${s.name} (${s.nights} noches)`).join(" → ")}`);
    if (alt.labels.length) lines.push(alt.labels.join(" · "));
    const highlights = p.itinerary?.days.flatMap((d) => d.activities.map((a) => a.name)).slice(0, 4) ?? [];
    if (highlights.length) lines.push(`Imperdibles: ${highlights.join(", ")}`);
  }
  lines.push("Propuesta diseñada con VIORA TRAVEL.");
  const text = lines.join("\n");
  return scanForMoney(text).length ? `${p.title}\nPropuesta diseñada con VIORA TRAVEL.` : text;
}
