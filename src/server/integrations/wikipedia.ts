/* eslint-disable @typescript-eslint/no-explicit-any -- respuestas JSON de la API de Wikipedia, validadas campo por campo */
/**
 * Fotos características desde Wikipedia: la imagen principal del artículo de un lugar
 * emblemático (p. ej. «Eiffel Tower», «Perito Moreno Glacier»). Es mucho más precisa que
 * buscar archivos sueltos en Wikimedia Commons, que devuelve mapas, retratos o fotos viejas.
 * Solo se aceptan licencias libres explícitas y fotos horizontales de buena resolución.
 * Sin dependencias del servidor: se prueba con un `fetchJson` simulado.
 */

export interface WikiImage {
  provider: "wikipedia";
  kind: "image";
  url: string;
  thumbUrl: string | null;
  width: number | null;
  height: number | null;
  title: string | null;
  author: string | null;
  authorUrl: null;
  sourceUrl: string | null;
  license: string | null;
  attribution: string;
  aiGenerated: false;
}

type FetchJson = (url: string) => Promise<any>;

const API = "https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2";
// Mapas, banderas, escudos, logos y collages no sirven como «foto del destino».
const NOT_A_PHOTO = /(map|karte|mapa|flag|bandera|coat_of_arms|escudo|logo|locator|location|seal|montage|collage|diagram|plan\b)/i;
const FREE_LICENSE = /^(cc0|cc by|cc-by|public domain|dominio p|pd\b)/i;

function stripHtml(s?: string): string | null {
  if (!s) return null;
  return s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 200) || null;
}

const norm = (s: string) => s.normalize("NFC").replace(/_/g, " ").replace(/^File:/i, "").trim().toLowerCase();

/** Nombres de archivo de la imagen principal: primero por título exacto; si no hay, por búsqueda. */
async function leadImageFiles(query: string, fetchJson: FetchJson): Promise<string[]> {
  const byTitle = await fetchJson(`${API}&redirects=1&prop=pageimages&piprop=name|original&titles=${encodeURIComponent(query)}`);
  const page = byTitle?.query?.pages?.[0];
  if (page && !page.missing && page.pageimage) return [page.pageimage as string];
  const search = await fetchJson(`${API}&generator=search&gsrnamespace=0&gsrlimit=5&gsrsearch=${encodeURIComponent(query)}&prop=pageimages&piprop=name|original`);
  const pages = ((search?.query?.pages ?? []) as any[]).slice().sort((a, b) => (a.index ?? 99) - (b.index ?? 99));
  return pages.map((p) => p.pageimage as string | undefined).filter((x): x is string => !!x);
}

export async function wikipediaImages(query: string, count: number, fetchJson: FetchJson): Promise<{ items: WikiImage[]; externalIds: string[] }> {
  const files = (await leadImageFiles(query, fetchJson)).filter((f) => /\.(jpe?g|webp)$/i.test(f) && !NOT_A_PHOTO.test(f)).slice(0, Math.max(count * 2, 3));
  if (!files.length) return { items: [], externalIds: [] };
  const titles = files.map((f) => `File:${f}`).join("|");
  const info = await fetchJson(`${API}&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=1600&titles=${encodeURIComponent(titles)}`);
  const pages = (info?.query?.pages ?? []) as any[];
  const items: WikiImage[] = [];
  const externalIds: string[] = [];
  for (const f of files) {
    const p = pages.find((x) => norm(x.title ?? "") === norm(f));
    const img = p?.imageinfo?.[0] ? toImage(p.imageinfo[0], query) : null;
    if (!img) continue;
    externalIds.push(`wp:${norm(f)}`);
    items.push(img);
    if (items.length >= count) break;
  }
  return { items, externalIds };
}

const chunk = <T,>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

/**
 * Versión agrupada: la imagen principal de muchos artículos con pocas consultas
 * (hasta 50 títulos por consulta). Es la forma recomendada de usar la API de Wikipedia
 * y evita los límites que se aplican a muchas consultas sueltas en paralelo.
 * Devuelve, por cada título pedido, 0 o 1 foto apta.
 */
export async function wikipediaLeadImages(titles: string[], fetchJson: FetchJson): Promise<Map<string, WikiImage[]>> {
  const out = new Map<string, WikiImage[]>(titles.map((t) => [t, []]));
  const fileOf = new Map<string, string>(); // título pedido → archivo
  for (const group of chunk(titles, 50)) {
    const res = await fetchJson(`${API}&redirects=1&prop=pageimages&piprop=name&pilimit=50&titles=${encodeURIComponent(group.join("|"))}`);
    const q = res?.query ?? {};
    const follow = new Map<string, string>();
    for (const n of [...(q.normalized ?? []), ...(q.redirects ?? [])] as { from: string; to: string }[]) follow.set(n.from, n.to);
    const pages = (q.pages ?? []) as any[];
    for (const t of group) {
      let final = t;
      for (let i = 0; i < 3 && follow.has(final); i++) final = follow.get(final)!;
      const page = pages.find((p) => p.title === final);
      const file = page?.pageimage as string | undefined;
      if (file && /\.(jpe?g|webp)$/i.test(file) && !NOT_A_PHOTO.test(file)) fileOf.set(t, file);
    }
  }
  const files = [...new Set(fileOf.values())];
  const info = new Map<string, any>();
  for (const group of chunk(files, 50)) {
    const res = await fetchJson(`${API}&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=1600&titles=${encodeURIComponent(group.map((f) => `File:${f}`).join("|"))}`);
    for (const p of (res?.query?.pages ?? []) as any[]) if (p.imageinfo?.[0]) info.set(norm(p.title ?? ""), p.imageinfo[0]);
  }
  for (const [t, f] of fileOf) {
    const ii = info.get(norm(f));
    const img = ii ? toImage(ii, t) : null;
    if (img) out.set(t, [img]);
  }
  return out;
}

function toImage(ii: any, title: string): WikiImage | null {
  const meta = ii.extmetadata ?? {};
  const license = meta.LicenseShortName?.value as string | undefined;
  if (!license || !FREE_LICENSE.test(license)) return null;
  const w = ii.width ?? 0;
  const h = ii.height ?? 0;
  // Se aceptan verticales (se recortan al mostrarlas), pero no imágenes chicas ni tiras muy angostas.
  if (Math.max(w, h) < 1000 || h > w * 1.8) return null;
  const author = stripHtml(meta.Artist?.value);
  return {
    provider: "wikipedia",
    kind: "image",
    url: ii.thumburl ?? ii.url,
    thumbUrl: ii.thumburl ?? null,
    width: ii.thumbwidth ?? w,
    height: ii.thumbheight ?? h,
    title,
    author,
    authorUrl: null,
    sourceUrl: ii.descriptionurl ?? null,
    license,
    attribution: `${author ?? "Autor desconocido"} — ${license}, vía Wikipedia`,
    aiGenerated: false,
  };
}
