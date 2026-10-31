/** Paquetes armados: categorías («experiencias») y paquetes de ejemplo para arrancar. */

export const PACKAGE_CATEGORIES = [
  { id: "disney", emoji: "🏰", label: "Disney y parques" },
  { id: "europa-clasica", emoji: "🗼", label: "Europa clásica" },
  { id: "europa-este", emoji: "🏯", label: "Europa del Este" },
  { id: "europa-historica", emoji: "🏛️", label: "Europa histórica" },
  { id: "francia", emoji: "🥐", label: "Francia" },
  { id: "playas", emoji: "🏖️", label: "Playas" },
  { id: "caribe", emoji: "🌴", label: "Caribe" },
  { id: "brasil", emoji: "🇧🇷", label: "Brasil" },
  { id: "latinoamerica", emoji: "🌎", label: "Latinoamérica" },
  { id: "argentina", emoji: "🏔️", label: "Argentina" },
  { id: "asia", emoji: "⛩️", label: "Asia" },
  { id: "lunas-de-miel", emoji: "💍", label: "Lunas de miel" },
] as const;

export type PackageCategory = (typeof PACKAGE_CATEGORIES)[number]["id"];

export interface PackageStop {
  destinationId: string;
  nights: number;
}

export interface PackageSeed {
  slug: string;
  title: string;
  category: PackageCategory;
  summary: string;
  stops: PackageStop[];
}

/**
 * Paquetes de ejemplo: solo recorrido y noches con destinos de la biblioteca. No traen precio
 * ni servicios incluidos: eso lo carga la agencia en el panel (hasta entonces se muestra «Consultá el precio»).
 */
export const SEED_PACKAGES: PackageSeed[] = [
  { slug: "disney-y-universal", title: "Disney y Universal", category: "disney", summary: "Los parques más famosos del mundo con días de descanso en el medio y tiempo para compras.", stops: [{ destinationId: "orlando", nights: 9 }] },
  { slug: "disney-y-miami", title: "Disney + Miami", category: "disney", summary: "Parques en Orlando y cierre con playa, compras y Art Decó en Miami.", stops: [{ destinationId: "orlando", nights: 7 }, { destinationId: "miami", nights: 3 }] },
  { slug: "europa-clasica-madrid-paris-roma", title: "Madrid, París y Roma", category: "europa-clasica", summary: "Las tres capitales imperdibles para un primer viaje a Europa.", stops: [{ destinationId: "madrid", nights: 4 }, { destinationId: "paris", nights: 5 }, { destinationId: "roma", nights: 5 }] },
  { slug: "londres-y-paris", title: "Londres y París", category: "europa-clasica", summary: "Dos capitales unidas por el Eurostar en un viaje clásico.", stops: [{ destinationId: "londres", nights: 5 }, { destinationId: "paris", nights: 5 }] },
  { slug: "praga-viena-budapest", title: "Praga, Viena y Budapest", category: "europa-este", summary: "El circuito de las capitales imperiales a orillas del Moldava y el Danubio.", stops: [{ destinationId: "praga", nights: 4 }, { destinationId: "viena", nights: 3 }, { destinationId: "budapest", nights: 4 }] },
  { slug: "cracovia-praga-viena", title: "Cracovia, Praga y Viena", category: "europa-este", summary: "Historia, castillos y cafés en el corazón de Europa central.", stops: [{ destinationId: "cracovia", nights: 3 }, { destinationId: "praga", nights: 4 }, { destinationId: "viena", nights: 3 }] },
  { slug: "grecia-e-italia", title: "Grecia e Italia clásicas", category: "europa-historica", summary: "La Acrópolis, el atardecer en Santorini y la Roma de los césares.", stops: [{ destinationId: "atenas", nights: 3 }, { destinationId: "santorini", nights: 3 }, { destinationId: "roma", nights: 5 }] },
  { slug: "andalucia-historica", title: "Andalucía y Madrid", category: "europa-historica", summary: "La Alhambra, los patios de Sevilla y los grandes museos de Madrid.", stops: [{ destinationId: "madrid", nights: 3 }, { destinationId: "sevilla", nights: 3 }, { destinationId: "granada", nights: 2 }] },
  { slug: "francia-paris-loira-normandia", title: "París, Loira y Normandía", category: "francia", summary: "París, los castillos del Loira y la abadía de Mont Saint-Michel.", stops: [{ destinationId: "paris", nights: 4 }, { destinationId: "loira", nights: 2 }, { destinationId: "normandia", nights: 3 }] },
  { slug: "provenza-y-costa-azul", title: "Provenza y Costa Azul", category: "francia", summary: "Pueblos de piedra, lavanda y el mar turquesa de Niza.", stops: [{ destinationId: "provenza", nights: 4 }, { destinationId: "costa-azul", nights: 5 }] },
  { slug: "punta-cana-all-inclusive", title: "Punta Cana all inclusive", category: "playas", summary: "Arena blanca, mar turquesa y un resort con todo resuelto.", stops: [{ destinationId: "punta-cana", nights: 7 }] },
  { slug: "aruba", title: "Aruba", category: "playas", summary: "Playas de postal y clima seco casi todo el año.", stops: [{ destinationId: "aruba", nights: 7 }] },
  { slug: "riviera-maya", title: "Riviera Maya", category: "caribe", summary: "Playas, cenotes y ruinas mayas frente al mar.", stops: [{ destinationId: "riviera-maya", nights: 7 }] },
  { slug: "aruba-y-curazao", title: "Aruba y Curazao", category: "caribe", summary: "Dos islas del Caribe en un solo viaje.", stops: [{ destinationId: "aruba", nights: 4 }, { destinationId: "curacao", nights: 4 }] },
  { slug: "rio-y-buzios", title: "Río de Janeiro y Búzios", category: "brasil", summary: "El Cristo, Copacabana y las playas tranquilas de Búzios.", stops: [{ destinationId: "rio", nights: 4 }, { destinationId: "buzios", nights: 4 }] },
  { slug: "maceio-maragogi", title: "Maceió y Maragogi", category: "brasil", summary: "Piscinas naturales y aguas cristalinas en el nordeste.", stops: [{ destinationId: "maceio", nights: 7 }] },
  { slug: "florianopolis", title: "Florianópolis", category: "brasil", summary: "Playas para todos los gustos, cerca de casa.", stops: [{ destinationId: "florianopolis", nights: 7 }] },
  { slug: "cusco-machu-picchu", title: "Cusco y Machu Picchu", category: "latinoamerica", summary: "La capital inca, el Valle Sagrado y la ciudadela más famosa de Sudamérica.", stops: [{ destinationId: "cusco", nights: 6 }] },
  { slug: "mexico-cdmx-riviera", title: "México: CDMX y Riviera Maya", category: "latinoamerica", summary: "Cultura y gastronomía en la capital, y descanso en el Caribe.", stops: [{ destinationId: "cdmx", nights: 4 }, { destinationId: "riviera-maya", nights: 5 }] },
  { slug: "patagonia-calafate-ushuaia", title: "Patagonia: El Calafate y Ushuaia", category: "argentina", summary: "El Perito Moreno y el fin del mundo.", stops: [{ destinationId: "el-calafate", nights: 3 }, { destinationId: "ushuaia", nights: 3 }] },
  { slug: "norte-argentino", title: "Salta y Jujuy", category: "argentina", summary: "Quebradas, cerros de colores y vinos de altura.", stops: [{ destinationId: "salta", nights: 5 }] },
  { slug: "bariloche", title: "Bariloche", category: "argentina", summary: "Lagos, bosques y chocolate en la Patagonia andina.", stops: [{ destinationId: "bariloche", nights: 5 }] },
  { slug: "japon-tokio-kioto", title: "Japón: Tokio y Kioto", category: "asia", summary: "Lo ultramoderno y lo tradicional, unidos por el tren bala.", stops: [{ destinationId: "tokio", nights: 6 }, { destinationId: "kioto", nights: 4 }] },
  { slug: "tailandia", title: "Tailandia: Bangkok y Phuket", category: "asia", summary: "Templos, mercados y playas de película.", stops: [{ destinationId: "bangkok", nights: 4 }, { destinationId: "phuket", nights: 6 }] },
  { slug: "maldivas", title: "Maldivas", category: "lunas-de-miel", summary: "Villas sobre el agua y arrecifes de colores.", stops: [{ destinationId: "maldivas", nights: 6 }] },
  { slug: "santorini-y-atenas", title: "Santorini y Atenas", category: "lunas-de-miel", summary: "Atardeceres en Oia y la historia de Atenas.", stops: [{ destinationId: "atenas", nights: 2 }, { destinationId: "santorini", nights: 5 }] },
  { slug: "bali", title: "Bali", category: "lunas-de-miel", summary: "Templos, terrazas de arroz y playas para desconectar.", stops: [{ destinationId: "bali", nights: 8 }] },
];

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
