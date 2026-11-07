import "server-only";
import { findMedia, type MediaItem } from "./integrations/media";

// Caché en memoria: evita repetir consultas a la base (y a los proveedores) en cada visita.
const memo = new Map<string, { at: number; items: MediaItem[] }>();
const inflight = new Map<string, Promise<MediaItem[]>>();
const HIT_MS = 30 * 60_000;
const MISS_MS = 2 * 60_000;

function lookup(query: string, count: number): Promise<MediaItem[]> {
  const key = `${query.trim().toLowerCase()}|${count}`;
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < (hit.items.length ? HIT_MS : MISS_MS)) return Promise.resolve(hit.items);
  let p = inflight.get(key);
  if (!p) {
    p = findMedia(query, "image", count)
      .then((r) => r.items)
      .catch(() => [] as MediaItem[])
      .then((items) => {
        memo.set(key, { at: Date.now(), items });
        if (memo.size > 2000) memo.delete(memo.keys().next().value!);
        return items;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  return p;
}

/**
 * Busca imágenes sin bloquear la página: si tarda más que `timeoutMs` se usa el reemplazo visual
 * y la búsqueda sigue en segundo plano, así la próxima visita ya tiene la foto.
 */
export async function imagesFor(query: string, count = 4, timeoutMs = 3500): Promise<MediaItem[]> {
  const res = await Promise.race([lookup(query, count), new Promise<null>((r) => setTimeout(() => r(null), timeoutMs))]);
  return res ?? [];
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
export async function firstImage(queries: string[], timeoutMs = 3500): Promise<MediaItem | null> {
  const results = await Promise.all(queries.map((q) => imagesFor(q, 1, timeoutMs)));
  return results.find((r) => r.length > 0)?.[0] ?? null;
}
