import "server-only";
import { TRIP_STYLE_DEFS } from "@/core/catalog";
import { PHOTO_SPOTS } from "@/core/library/photo-spots";
import { getJson, hasFreshMedia, storeMediaResult } from "./integrations/media";
import { wikipediaImages, wikipediaLeadImages } from "./integrations/wikipedia";
import { loadLibrary } from "./settings";

/** Fotos de la portada, en orden de preferencia (se usa la primera que exista). */
export const HERO_SPOTS = ["Baía do Sancho", "Perito Moreno Glacier", "Oia, Greece", "Iguazu Falls"];

let running: Promise<WarmResult> | null = null;

export interface WarmResult {
  titles: number;
  found: number;
  missing: string[];
  error?: string;
}

async function allTitles(): Promise<string[]> {
  const library = await loadLibrary();
  const spots = library.flatMap((d) => d.photoSpots ?? PHOTO_SPOTS[d.id] ?? []);
  return [...new Set([...HERO_SPOTS, ...TRIP_STYLE_DEFS.flatMap((s) => s.photoSpots), ...spots])];
}

/**
 * Busca de antemano las fotos de todos los lugares emblemáticos (pocas consultas agrupadas)
 * y las deja en caché: así las páginas no esperan a Wikipedia y no se generan ráfagas.
 */
export function warmPhotos(opts: { force?: boolean } = {}): Promise<WarmResult> {
  running ??= (async () => {
    const all = await allTitles();
    const titles = opts.force ? all : (await Promise.all(all.map(async (t) => ((await hasFreshMedia(t)) ? null : t)))).filter((t): t is string => !!t);
    const result: WarmResult = { titles: titles.length, found: 0, missing: [] };
    if (!titles.length || process.env.WIKIMEDIA_DISABLED === "1") return result;
    try {
      const map = await wikipediaLeadImages(titles, (url) => getJson(url));
      for (const [title, imgs] of map) {
        let items = imgs;
        // Sin foto por título exacto: se prueba la búsqueda (artículo más parecido).
        if (!items.length) items = (await wikipediaImages(title, 1, (url) => getJson(url)).catch(() => ({ items: [] }))).items;
        await storeMediaResult(title, "image", "wikipedia", { status: items.length ? "ok" : "empty", items, externalIds: items.map((i) => i.url) });
        if (items.length) result.found++;
        else result.missing.push(title);
      }
    } catch (e) {
      result.error = (e as Error).message;
    }
    return result;
  })().finally(() => {
    running = null;
  });
  return running;
}

/** Se llama al iniciar el servidor: precarga a los pocos segundos y luego una vez por semana. */
export function scheduleWarmup() {
  if (process.env.MEDIA_WARMUP === "0") return;
  const run = () => warmPhotos().then((r) => console.log(`[fotos] ${r.found}/${r.titles} lugares con foto${r.error ? ` · error: ${r.error}` : ""}`)).catch(() => {});
  setTimeout(run, 15_000).unref?.();
  setInterval(run, 7 * 86400000).unref?.();
}
