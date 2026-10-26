import type { BudgetTier, Criterion, Interest, InterestVector, LodgingType, Priority, TransportMode, TripStyle } from "./types";

export interface TripStyleDef {
  id: TripStyle;
  label: string;
  hint: string;
  imageQuery: string;
  accent: "teal" | "orange" | "coral" | "purple" | "cyan";
  interests: InterestVector; // 0..1
  shape: "single" | "multi" | "open";
}

export const TRIP_STYLE_DEFS: TripStyleDef[] = [
  { id: "beach_relax", label: "Relax y playa", hint: "Arena, mar y descanso", imageQuery: "turquoise beach white sand", accent: "cyan", interests: { beach: 1, relax: 1 }, shape: "single" },
  { id: "eurotrip", label: "Eurotrip", hint: "Varias ciudades y países", imageQuery: "europe old town street", accent: "purple", interests: { culture: 0.9, iconic: 0.9, architecture: 0.8, history: 0.7 }, shape: "multi" },
  { id: "big_cities", label: "Grandes ciudades", hint: "Íconos urbanos y vida de ciudad", imageQuery: "city skyline night", accent: "purple", interests: { iconic: 1, culture: 0.7, shopping: 0.5, nightlife: 0.5, gastronomy: 0.6 }, shape: "multi" },
  { id: "nature_adventure", label: "Naturaleza y aventura", hint: "Paisajes, trekking y aire libre", imageQuery: "mountain lake trekking", accent: "teal", interests: { nature: 1, adventure: 0.9 }, shape: "open" },
  { id: "romantic", label: "Viaje romántico", hint: "Pueblos, atardeceres y buena mesa", imageQuery: "romantic sunset village", accent: "coral", interests: { romance: 1, gastronomy: 0.7, relax: 0.5 }, shape: "open" },
  { id: "honeymoon", label: "Luna de miel", hint: "Un viaje para recordar siempre", imageQuery: "overwater villa sunset", accent: "coral", interests: { romance: 1, relax: 0.8, beach: 0.6, luxury: 0.5 }, shape: "open" },
  { id: "family", label: "Viaje familiar", hint: "Planes para grandes y chicos", imageQuery: "family beach vacation", accent: "orange", interests: { family: 1, beach: 0.4, themeparks: 0.4 }, shape: "single" },
  { id: "theme_parks", label: "Parques temáticos", hint: "Magia, montañas rusas y shows", imageQuery: "theme park castle fireworks", accent: "purple", interests: { themeparks: 1, family: 0.7 }, shape: "single" },
  { id: "culture_history", label: "Cultura e historia", hint: "Museos, ruinas y patrimonio", imageQuery: "ancient ruins museum", accent: "orange", interests: { culture: 1, history: 1, architecture: 0.7 }, shape: "multi" },
  { id: "gastronomy", label: "Gastronomía y experiencias locales", hint: "Mercados, vinos y cocina local", imageQuery: "local food market", accent: "orange", interests: { gastronomy: 1, wine: 0.6, offbeat: 0.4 }, shape: "open" },
  { id: "luxury", label: "Lujo y exclusividad", hint: "Servicio impecable y lugares únicos", imageQuery: "luxury resort pool", accent: "purple", interests: { luxury: 1, relax: 0.6, wellness: 0.6 }, shape: "open" },
  { id: "backpacker", label: "Mochilero y bajo presupuesto", hint: "Más lugares, menos gasto", imageQuery: "backpacker hostel travel", accent: "teal", interests: { adventure: 0.6, offbeat: 0.7, nightlife: 0.4 }, shape: "multi" },
  { id: "cruise", label: "Cruceros", hint: "Varios destinos sin cambiar de cuarto", imageQuery: "cruise ship sea", accent: "cyan", interests: { relax: 0.7, beach: 0.5, iconic: 0.4 }, shape: "single" },
  { id: "shopping", label: "Viaje de compras", hint: "Outlets, tiendas y ciudad", imageQuery: "shopping street", accent: "coral", interests: { shopping: 1, iconic: 0.4 }, shape: "single" },
  { id: "exotic", label: "Destinos exóticos", hint: "Culturas y paisajes distintos", imageQuery: "asia temple", accent: "teal", interests: { offbeat: 1, culture: 0.7, nature: 0.5 }, shape: "open" },
  { id: "road_trip", label: "Road trip", hint: "La ruta como parte del viaje", imageQuery: "road trip scenic highway", accent: "orange", interests: { nature: 0.8, adventure: 0.6, offbeat: 0.5 }, shape: "multi" },
  { id: "mixed", label: "Combinación de estilos", hint: "Un poco de todo", imageQuery: "travel collage landscape", accent: "cyan", interests: { beach: 0.5, culture: 0.5, nature: 0.5 }, shape: "open" },
  { id: "discover", label: "Todavía no lo sé", hint: "Quiero descubrir opciones", imageQuery: "world map travel", accent: "teal", interests: {}, shape: "open" },
];

export const TRIP_STYLE_BY_ID = Object.fromEntries(TRIP_STYLE_DEFS.map((s) => [s.id, s])) as Record<TripStyle, TripStyleDef>;

export interface PriorityDef {
  id: Priority;
  label: string;
  interests?: InterestVector;
  weightBoost?: Partial<Record<Criterion, number>>; // multiplicador adicional
}

export const PRIORITY_DEFS: PriorityDef[] = [
  { id: "rest", label: "Descansar", interests: { relax: 1 }, weightBoost: { pace: 0.6, logistics: 0.5 } },
  { id: "many_places", label: "Conocer muchos lugares", interests: { iconic: 0.5, culture: 0.4 }, weightBoost: { experiences: 0.5 } },
  { id: "few_hotel_changes", label: "Evitar cambiar de hotel constantemente", weightBoost: { logistics: 0.7, pace: 0.4 } },
  { id: "eat_well", label: "Comer bien", interests: { gastronomy: 1 } },
  { id: "quiet_beaches", label: "Disfrutar de playas tranquilas", interests: { beach: 0.8, relax: 0.6 } },
  { id: "historic_sites", label: "Visitar lugares históricos", interests: { history: 1, culture: 0.6 } },
  { id: "nightlife", label: "Salir de noche", interests: { nightlife: 1 } },
  { id: "shopping", label: "Hacer compras", interests: { shopping: 1 } },
  { id: "authentic", label: "Tener experiencias auténticas", interests: { offbeat: 0.8, gastronomy: 0.4 } },
  { id: "comfort", label: "Viajar con comodidad", weightBoost: { logistics: 0.5, travelTime: 0.4 } },
  { id: "optimize_budget", label: "Optimizar el presupuesto", weightBoost: { budget: 1 } },
  { id: "avoid_crowds", label: "Evitar multitudes", interests: { offbeat: 0.5 }, weightBoost: { risks: 0.3 } },
  { id: "landscapes", label: "Priorizar paisajes", interests: { nature: 1 } },
  { id: "free_time", label: "Tener tiempo libre", weightBoost: { pace: 0.6 } },
  { id: "famous_sights", label: "Visitar atracciones famosas", interests: { iconic: 1 } },
  { id: "central_lodging", label: "Alojarse en zonas céntricas" },
  { id: "slow_pace", label: "Viajar a un ritmo tranquilo", weightBoost: { pace: 0.8 } },
];

export const PRIORITY_BY_ID = Object.fromEntries(PRIORITY_DEFS.map((p) => [p.id, p])) as Record<Priority, PriorityDef>;

export const BUDGET_TIER_DEFS: { id: BudgetTier; label: string; hint: string; level: number }[] = [
  { id: "backpacker", label: "Mochilero", hint: "Hostels, transporte público y comida callejera", level: 1 },
  { id: "economic", label: "Económico", hint: "Hoteles sencillos y gasto cuidado", level: 2 },
  { id: "moderate", label: "Moderado", hint: "Hoteles de categoría media, bien ubicados", level: 3 },
  { id: "comfort", label: "Confortable", hint: "Hoteles superiores y algunos gustos", level: 4 },
  { id: "premium", label: "Premium", hint: "Experiencias y hoteles destacados", level: 5 },
  { id: "unlimited", label: "Sin preocuparme por el presupuesto", hint: "La experiencia es lo primero", level: 6 },
];

/**
 * Descripción cualitativa (sin cifras) de qué suele implicar cada nivel según la región.
 * Le da contexto al cliente sin imponer rangos numéricos universales.
 */
export const BUDGET_REGION_HINTS: Record<string, string> = {
  europa: "En Europa, un nivel moderado suele implicar hoteles de categoría media bien ubicados, trenes en clase estándar y comidas en restaurantes locales.",
  caribe: "En el Caribe, el régimen all-inclusive es habitual y simplifica el gasto diario; la categoría del resort define buena parte de la experiencia.",
  brasil: "En Brasil hay posadas y hoteles para todos los niveles; las zonas más exclusivas y la temporada alta encarecen sensiblemente.",
  usa: "En Estados Unidos, las entradas a parques, el alquiler de auto y los impuestos locales pesan bastante en el total.",
  asia: "En el sudeste asiático el gasto diario suele rendir más; en Japón el transporte y el alojamiento en ciudades grandes son relevantes.",
  sudamerica: "Dentro de Sudamérica la distancia y la temporada (feriados, vacaciones de invierno) son las variables que más mueven el presupuesto.",
};

export const LODGING_LABELS: Record<LodgingType, string> = {
  hostel: "Hostel",
  budget_hotel: "Hotel económico",
  mid_hotel: "Hotel de categoría media",
  upscale_hotel: "Hotel superior",
  all_inclusive: "Resort all-inclusive",
  boutique: "Boutique hotel",
  apartment: "Departamento",
  rural: "Cabaña o alojamiento rural",
  luxury: "Alojamiento de lujo",
};

export const TRANSPORT_LABELS: Record<TransportMode, string> = {
  plane: "Avión",
  train: "Tren",
  bus: "Autobús",
  car: "Auto alquilado",
  private_transfer: "Traslados privados",
  public_transport: "Transporte público",
  ferry: "Ferry",
};

export const INTEREST_LABELS: Record<Interest, string> = {
  beach: "playa",
  relax: "descanso",
  culture: "cultura",
  history: "historia",
  architecture: "arquitectura",
  gastronomy: "gastronomía",
  nature: "naturaleza",
  adventure: "aventura",
  nightlife: "vida nocturna",
  shopping: "compras",
  romance: "romance",
  family: "planes en familia",
  themeparks: "parques temáticos",
  iconic: "lugares icónicos",
  offbeat: "lugares fuera del circuito",
  luxury: "lujo",
  wellness: "bienestar",
  wine: "vinos",
};

export const MONTHS_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** Ponderaciones base del modelo de puntaje. Editables por la agencia (settings). */
export const BASE_WEIGHTS: Record<Criterion, number> = {
  affinity: 3,
  dates: 1.5,
  climate: 2,
  logistics: 1.5,
  budget: 1.5,
  travelTime: 1,
  pace: 1,
  experiences: 1.5,
  group: 1.5,
  risks: 1,
};

/** Ciudades de origen frecuentes (coordenadas para estimar distancias). */
export const ORIGIN_CITIES: { city: string; country: string; airports: string[]; lat: number; lng: number }[] = [
  { city: "Buenos Aires", country: "Argentina", airports: ["EZE", "AEP"], lat: -34.82, lng: -58.54 },
  { city: "Córdoba", country: "Argentina", airports: ["COR"], lat: -31.32, lng: -64.21 },
  { city: "Rosario", country: "Argentina", airports: ["ROS"], lat: -32.9, lng: -60.78 },
  { city: "Mendoza", country: "Argentina", airports: ["MDZ"], lat: -32.83, lng: -68.79 },
  { city: "Tucumán", country: "Argentina", airports: ["TUC"], lat: -26.84, lng: -65.1 },
  { city: "Neuquén", country: "Argentina", airports: ["NQN"], lat: -38.95, lng: -68.16 },
  { city: "Mar del Plata", country: "Argentina", airports: ["MDQ"], lat: -37.93, lng: -57.57 },
  { city: "Salta", country: "Argentina", airports: ["SLA"], lat: -24.86, lng: -65.49 },
  { city: "Montevideo", country: "Uruguay", airports: ["MVD"], lat: -34.84, lng: -56.03 },
  { city: "Santiago", country: "Chile", airports: ["SCL"], lat: -33.39, lng: -70.79 },
  { city: "Asunción", country: "Paraguay", airports: ["ASU"], lat: -25.24, lng: -57.52 },
  { city: "San Pablo", country: "Brasil", airports: ["GRU"], lat: -23.43, lng: -46.47 },
  { city: "Lima", country: "Perú", airports: ["LIM"], lat: -12.02, lng: -77.11 },
  { city: "Bogotá", country: "Colombia", airports: ["BOG"], lat: 4.7, lng: -74.15 },
  { city: "Ciudad de México", country: "México", airports: ["MEX"], lat: 19.44, lng: -99.07 },
  { city: "Madrid", country: "España", airports: ["MAD"], lat: 40.47, lng: -3.56 },
  { city: "Miami", country: "Estados Unidos", airports: ["MIA"], lat: 25.79, lng: -80.29 },
];
