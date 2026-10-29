import "server-only";
import { findMedia, type MediaItem } from "./integrations/media";

/** Busca imágenes sin bloquear la página: si un proveedor tarda o falla, se usa el reemplazo visual. */
export async function imagesFor(query: string, count = 4, timeoutMs = 3500): Promise<MediaItem[]> {
  try {
    const res = await Promise.race([
      findMedia(query, "image", count),
      new Promise<null>((r) => setTimeout(() => r(null), timeoutMs)),
    ]);
    return res?.items ?? [];
  } catch {
    return [];
  }
}

export async function videosFor(query: string, count = 3): Promise<{ items: MediaItem[]; configured: boolean }> {
  try {
    const res = await Promise.race([findMedia(query, "video", count), new Promise<null>((r) => setTimeout(() => r(null), 3500))]);
    const configured = !(res?.statuses ?? []).every((s) => s.status === "not_configured");
    return { items: res?.items ?? [], configured: res ? configured : true };
  } catch {
    return { items: [], configured: true };
  }
}

/** Primera foto real disponible entre varias búsquedas (en orden de preferencia). */
export async function firstImage(queries: string[]): Promise<MediaItem | null> {
  const results = await Promise.all(queries.map((q) => imagesFor(q, 1)));
  return results.find((r) => r.length > 0)?.[0] ?? null;
}
