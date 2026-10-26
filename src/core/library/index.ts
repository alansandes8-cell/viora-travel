import type { Destination } from "../types";
import { AMERICAS } from "./destinations-americas";
import { ASIA } from "./destinations-asia";
import { EUROPE } from "./destinations-europe";

export { KNOWN_CONNECTIONS, ENTRY_LINKS } from "./connections";

/** Biblioteca semilla. En ejecución, la fuente es la tabla `destinations` (editable por la agencia). */
export const SEED_DESTINATIONS: Destination[] = [...EUROPE, ...AMERICAS, ...ASIA];

/** Superregiones: los clusters de una misma superregión pueden combinarse en una ruta. */
export const SUPER_REGION: Record<string, string> = {
  iberia: "europa",
  "europa-occidental": "europa",
  "europa-central": "europa",
  italia: "europa",
  "mediterraneo-este": "europa",
  caribe: "caribe",
  brasil: "brasil",
  usa: "usa",
  andes: "sudamerica",
  patagonia: "argentina",
  "argentina-norte": "argentina",
  mexico: "mexico",
  centroamerica: "centroamerica",
  japon: "japon",
  "sudeste-asiatico": "sudeste-asiatico",
  indico: "indico",
  "medio-oriente": "medio-oriente",
};

export const SUPER_REGION_LABEL: Record<string, string> = {
  europa: "Europa",
  caribe: "Caribe",
  brasil: "Brasil",
  usa: "Estados Unidos",
  sudamerica: "Sudamérica",
  argentina: "Argentina",
  mexico: "México",
  centroamerica: "Centroamérica",
  japon: "Japón",
  "sudeste-asiatico": "Sudeste asiático",
  indico: "Océano Índico",
  "medio-oriente": "Medio Oriente",
};

/** Región para los textos cualitativos de presupuesto. */
export const BUDGET_REGION: Record<string, string> = {
  europa: "europa",
  caribe: "caribe",
  brasil: "brasil",
  usa: "usa",
  sudamerica: "sudamerica",
  argentina: "sudamerica",
  mexico: "caribe",
  centroamerica: "caribe",
  japon: "asia",
  "sudeste-asiatico": "asia",
  indico: "asia",
  "medio-oriente": "asia",
};
