import type { Destination, LibraryActivity } from "./types";
import { normalize } from "./text";

/**
 * Experiencias concretas que el cliente puede pedir con sus palabras («quiero hacer trekking»).
 * `ask` detecta el pedido en el texto; `offers` detecta destinos/actividades que realmente la ofrecen.
 */
export const EXPERIENCES: { id: string; label: string; ask: RegExp; offers: RegExp }[] = [
  { id: "trekking", label: "Trekking y caminatas", ask: /\b(trek|trekking|sender|caminat|hiking|montanismo|escalar|ascenso)/, offers: /trek|sender|caminata|laguna|glaciar|chalten|fitz roy|volcan|ascenso|camino inca|montana de colores|siete colores|cerro/ },
  { id: "diving", label: "Buceo y snorkel", ask: /\b(buce|snorkel|arrecife|tortugas)/, offers: /buce|snorkel|arrecife|tortuga/ },
  { id: "wine", label: "Vinos y bodegas", ask: /\b(vino|bodega|enolog|vinedo)/, offers: /bodega|vino|vinedo|toscana/ },
  { id: "ski", label: "Esquí y nieve", ask: /\b(esqui|ski|snowboard|nieve)/, offers: /esqui|ski|nieve/ },
  { id: "surf", label: "Surf y kitesurf", ask: /\b(surf|kite)/, offers: /surf|kite/ },
  { id: "rafting", label: "Rafting y kayak", ask: /\b(rafting|kayak|canotaje)/, offers: /rafting|kayak/ },
  { id: "glaciers", label: "Glaciares", ask: /\bglaciar/, offers: /glaciar|perito moreno|hielo/ },
  { id: "desert", label: "Desierto y dunas", ask: /\b(desierto|dunas|safari)/, offers: /desierto|duna|safari|valle de la luna|salar/ },
  { id: "wildlife", label: "Fauna y avistajes", ask: /\b(ballena|pinguin|fauna|avistaje|animales salvajes)/, offers: /ballena|pinguin|lobos marinos|tortuga|fauna|avistaje|santuario/ },
];

export function detectExperiences(text: string): string[] {
  const t = ` ${normalize(text)} `;
  return EXPERIENCES.filter((e) => e.ask.test(t)).map((e) => e.id);
}

const activityText = (a: LibraryActivity) => normalize(`${a.name} ${a.note ?? ""}`);

/** Experiencias pedidas que la actividad ofrece. */
export function activityOffers(a: LibraryActivity, wanted: string[]): number {
  if (!wanted.length) return 0;
  const t = activityText(a);
  return EXPERIENCES.filter((e) => wanted.includes(e.id) && e.offers.test(t)).length;
}

/** Cuántas de las experiencias pedidas ofrece el destino (según sus actividades). */
export function destinationOffers(d: Destination, wanted: string[]): number {
  if (!wanted.length) return 0;
  return EXPERIENCES.filter((e) => wanted.includes(e.id) && d.highlights.some((a) => e.offers.test(activityText(a)))).length;
}
