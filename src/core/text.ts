import type { Destination, Interest } from "./types";

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ALIASES: Record<string, string[]> = {
  londres: ["london"],
  paris: ["paris"],
  roma: ["rome"],
  florencia: ["florence", "firenze", "toscana"],
  venecia: ["venice"],
  amalfi: ["positano", "capri", "costa amalfitana", "napoles", "sorrento"],
  amsterdam: ["holanda", "amsterdam"],
  brujas: ["bruges", "brugge", "belgica", "bruselas", "gante"],
  praga: ["prague"],
  viena: ["vienna", "wien"],
  munich: ["munchen", "baviera"],
  berlin: ["berlin"],
  lisboa: ["lisbon", "sintra"],
  porto: ["oporto"],
  sevilla: ["seville", "andalucia"],
  granada: ["alhambra"],
  edimburgo: ["edinburgh", "escocia"],
  ljubljana: ["liubliana", "bled", "eslovenia"],
  cracovia: ["krakow", "polonia"],
  atenas: ["athens"],
  santorini: ["islas griegas", "mykonos"],
  dubrovnik: ["croacia", "split"],
  "punta-cana": ["punta cana", "dominicana", "bavaro"],
  "riviera-maya": ["cancun", "playa del carmen", "tulum", "riviera maya"],
  aruba: ["aruba"],
  curacao: ["curazao", "curacao"],
  "san-andres": ["san andres"],
  cartagena: ["cartagena"],
  rio: ["rio de janeiro", "rio"],
  florianopolis: ["floripa", "florianopolis"],
  buzios: ["buzios"],
  "porto-galinhas": ["porto de galinhas"],
  maceio: ["maceio", "maragogi"],
  jericoacoara: ["jeri", "jericoacoara"],
  noronha: ["noronha", "fernando de noronha"],
  orlando: ["disney", "orlando", "universal"],
  miami: ["miami"],
  "nueva-york": ["new york", "nueva york", "nyc", "manhattan"],
  cusco: ["machu picchu", "cusco", "cuzco"],
  cdmx: ["ciudad de mexico", "cdmx", "df"],
  "costa-rica": ["costa rica"],
  atacama: ["atacama", "san pedro de atacama"],
  bariloche: ["bariloche"],
  "el-calafate": ["calafate", "perito moreno", "chalten"],
  ushuaia: ["ushuaia", "tierra del fuego"],
  salta: ["salta", "jujuy", "purmamarca", "humahuaca", "cafayate"],
  mendoza: ["mendoza"],
  iguazu: ["iguazu", "cataratas"],
  tokio: ["tokyo", "tokio"],
  kioto: ["kyoto", "kioto"],
  osaka: ["osaka"],
  bangkok: ["bangkok"],
  phuket: ["phuket", "phi phi", "krabi"],
  bali: ["bali"],
  maldivas: ["maldivas", "maldives"],
  dubai: ["dubai", "dubái", "emiratos"],
};

const REGION_WORDS: Record<string, string[]> = {
  europa: ["europa", "eurotrip", "europe"],
  caribe: ["caribe", "caribbean"],
  brasil: ["brasil", "brazil"],
  usa: ["estados unidos", "eeuu", "ee uu", "usa"],
  japon: ["japon", "japan"],
  "sudeste-asiatico": ["sudeste asiatico", "tailandia", "thailand", "indonesia"],
  argentina: ["argentina", "patagonia"],
  sudamerica: ["peru", "chile", "sudamerica"],
  mexico: ["mexico"],
};

/** Detecta destinos de la biblioteca mencionados en un texto libre. */
export function matchDestinations(text: string, library: Destination[]): string[] {
  const t = ` ${normalize(text)} `;
  const found = new Set<string>();
  for (const d of library) {
    const keys = [normalize(d.name), d.id.replace(/-/g, " "), ...(ALIASES[d.id] ?? []).map(normalize)];
    if (keys.some((k) => k.length > 2 && t.includes(` ${k} `))) found.add(d.id);
  }
  return [...found];
}

export function matchRegions(text: string): string[] {
  const t = ` ${normalize(text)} `;
  return Object.entries(REGION_WORDS)
    .filter(([, words]) => words.some((w) => t.includes(` ${normalize(w)} `)))
    .map(([r]) => r);
}

/** Países mencionados (por nombre) → ids de destinos de ese país. */
export function matchCountries(text: string, library: Destination[]): string[] {
  const t = ` ${normalize(text)} `;
  const out = new Set<string>();
  for (const d of library) {
    const c = normalize(d.country.split("(")[0]);
    if (c.length > 3 && t.includes(` ${c} `)) out.add(d.id);
  }
  return [...out];
}

const KEYWORDS: [RegExp, Interest][] = [
  [/playa|arena|turquesa|mar |caribe|isla/, "beach"],
  [/descans|relaj|tranquil|desconect/, "relax"],
  [/museo|cultura|arte/, "culture"],
  [/histori|ruinas|antig/, "history"],
  [/arquitect|catedral|castillo/, "architecture"],
  [/gastronom|comer|comida|restaurante|cocina/, "gastronomy"],
  [/naturaleza|montana|paisaje|lago|bosque|glaciar|selva/, "nature"],
  [/aventura|trekking|buceo|rafting|kite|surf/, "adventure"],
  [/noche|fiesta|boliche|bares/, "nightlife"],
  [/compras|shopping|outlet/, "shopping"],
  [/romantic|pareja|luna de miel|aniversario/, "romance"],
  [/hijos|chicos|ninos|familia|nenes/, "family"],
  [/disney|parque tematico|parques tematicos|universal|montanas rusas/, "themeparks"],
  [/lujo|exclusiv|5 estrellas/, "luxury"],
  [/vino|bodega/, "wine"],
  [/spa|bienestar|termas|wellness/, "wellness"],
  [/diferente|autentic|poco turistic|fuera del circuito|no tan conocid/, "offbeat"],
  [/famos|iconic|imperdible/, "iconic"],
];

export function extractInterests(text: string): Interest[] {
  const t = ` ${normalize(text)} `;
  return KEYWORDS.filter(([re]) => re.test(t)).map(([, i]) => i);
}

/** "14 días", "dos semanas", "10 noches" → noches. */
export function extractNights(text: string): number | null {
  const t = normalize(text);
  const words: Record<string, number> = { una: 1, un: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, diez: 10, quince: 15, veinte: 20 };
  const m = t.match(/(\d{1,2}|una|un|dos|tres|cuatro|cinco|diez|quince|veinte)\s*(dias|noches|semanas?)/);
  if (!m) return null;
  const n = /\d/.test(m[1]) ? parseInt(m[1], 10) : words[m[1]];
  if (m[2].startsWith("semana")) return n * 7;
  if (m[2] === "dias") return Math.max(1, n - 1);
  return n;
}
