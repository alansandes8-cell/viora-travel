import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "../db";

/**
 * Imágenes y videos con fuente, autor y licencia. Cada proveedor es un adaptador;
 * si falta la credencial, se informa "no configurado" y se sigue con el próximo.
 * Nunca se re-alojan videos de terceros: solo se guardan metadatos y se usa el embed oficial.
 */

export interface MediaItem {
  id: string;
  provider: string;
  kind: "image" | "video";
  url: string;
  thumbUrl: string | null;
  width: number | null;
  height: number | null;
  title: string | null;
  author: string | null;
  authorUrl: string | null;
  sourceUrl: string | null;
  license: string | null;
  attribution: string | null;
  aiGenerated: boolean;
}

interface ProviderResult {
  status: "ok" | "empty" | "not_configured" | "error";
  items: Omit<MediaItem, "id">[];
  error?: string;
  externalIds?: string[];
}

interface Provider {
  name: string;
  kind: "image" | "video";
  configured: () => boolean;
  search: (query: string, count: number) => Promise<ProviderResult & { externalIds: string[] }>;
}

const UA = "VioraTravel/1.0 (agencia de viajes; contacto en el sitio)";
const TTL_DAYS = 30;

async function getJson(url: string, headers: Record<string, string> = {}) {
  const res = await fetch(url, { headers: { "User-Agent": UA, ...headers }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const unsplash: Provider = {
  name: "unsplash",
  kind: "image",
  configured: () => !!process.env.UNSPLASH_ACCESS_KEY,
  async search(query, count) {
    const data = await getJson(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape&content_filter=high`,
      { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`, "Accept-Version": "v1" },
    );
    const results = (data.results ?? []) as Record<string, any>[];
    return {
      status: results.length ? "ok" : "empty",
      externalIds: results.map((r) => String(r.id)),
      items: results.map((r) => ({
        provider: "unsplash",
        kind: "image" as const,
        // Las guías de Unsplash exigen usar (hotlink) las URLs que devuelve la API.
        url: r.urls?.regular,
        thumbUrl: r.urls?.small ?? null,
        width: r.width ?? null,
        height: r.height ?? null,
        title: r.alt_description ?? null,
        author: r.user?.name ?? null,
        authorUrl: r.user?.links?.html ? `${r.user.links.html}?utm_source=viora_travel&utm_medium=referral` : null,
        sourceUrl: r.links?.html ? `${r.links.html}?utm_source=viora_travel&utm_medium=referral` : null,
        license: "Licencia de Unsplash",
        attribution: r.user?.name ? `Foto de ${r.user.name} en Unsplash` : "Unsplash",
        aiGenerated: false,
      })),
    };
  },
};

const pexels: Provider = {
  name: "pexels",
  kind: "image",
  configured: () => !!process.env.PEXELS_API_KEY,
  async search(query, count) {
    const data = await getJson(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`, {
      Authorization: process.env.PEXELS_API_KEY!,
    });
    const photos = (data.photos ?? []) as Record<string, any>[];
    return {
      status: photos.length ? "ok" : "empty",
      externalIds: photos.map((p) => String(p.id)),
      items: photos.map((p) => ({
        provider: "pexels",
        kind: "image" as const,
        url: p.src?.large2x ?? p.src?.large,
        thumbUrl: p.src?.medium ?? null,
        width: p.width ?? null,
        height: p.height ?? null,
        title: p.alt ?? null,
        author: p.photographer ?? null,
        authorUrl: p.photographer_url ?? null,
        sourceUrl: p.url ?? null,
        license: "Licencia de Pexels",
        attribution: p.photographer ? `Foto de ${p.photographer} en Pexels` : "Pexels",
        aiGenerated: false,
      })),
    };
  },
};

function stripHtml(s?: string): string | null {
  if (!s) return null;
  return s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 200) || null;
}

/** Wikimedia Commons: no requiere clave. Solo se aceptan licencias libres explícitas (CC0, CC BY, CC BY-SA, dominio público). */
const wikimedia: Provider = {
  name: "wikimedia",
  kind: "image",
  configured: () => process.env.WIKIMEDIA_DISABLED !== "1",
  async search(query, count) {
    const url =
      `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=${count * 2}` +
      `&gsrsearch=${encodeURIComponent(`${query} filetype:bitmap`)}&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=1600&origin=*`;
    const data = await getJson(url);
    const pages = Object.values(data.query?.pages ?? {}) as Record<string, any>[];
    const items: Omit<MediaItem, "id">[] = [];
    const ids: string[] = [];
    for (const p of pages) {
      const info = p.imageinfo?.[0];
      const meta = info?.extmetadata ?? {};
      const license = meta.LicenseShortName?.value as string | undefined;
      if (!info || !license || !/^(cc0|cc by|cc-by|public domain|dominio p)/i.test(license)) continue;
      if ((info.width ?? 0) < 1000 || (info.width ?? 0) < (info.height ?? 0)) continue;
      ids.push(String(p.pageid));
      const author = stripHtml(meta.Artist?.value);
      items.push({
        provider: "wikimedia",
        kind: "image",
        url: info.thumburl ?? info.url,
        thumbUrl: info.thumburl ?? null,
        width: info.thumbwidth ?? info.width ?? null,
        height: info.thumbheight ?? info.height ?? null,
        title: stripHtml(meta.ObjectName?.value) ?? p.title,
        author,
        authorUrl: null,
        sourceUrl: info.descriptionurl ?? null,
        license,
        attribution: `${author ?? "Autor desconocido"} — ${license}, vía Wikimedia Commons`,
        aiGenerated: false,
      });
      if (items.length >= count) break;
    }
    return { status: items.length ? "ok" : "empty", items, externalIds: ids };
  },
};

const youtube: Provider = {
  name: "youtube",
  kind: "video",
  configured: () => !!process.env.YOUTUBE_API_KEY,
  async search(query, count) {
    const data = await getJson(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&safeSearch=strict&relevanceLanguage=es&maxResults=${count}&q=${encodeURIComponent(query)}&key=${process.env.YOUTUBE_API_KEY}`,
    );
    const items = (data.items ?? []) as Record<string, any>[];
    return {
      status: items.length ? "ok" : "empty",
      externalIds: items.map((i) => String(i.id?.videoId)),
      items: items.map((i) => ({
        provider: "youtube",
        kind: "video" as const,
        url: `https://www.youtube-nocookie.com/embed/${i.id.videoId}`,
        thumbUrl: i.snippet?.thumbnails?.high?.url ?? null,
        width: null,
        height: null,
        title: i.snippet?.title ?? null,
        author: i.snippet?.channelTitle ?? null,
        authorUrl: i.snippet?.channelId ? `https://www.youtube.com/channel/${i.snippet.channelId}` : null,
        sourceUrl: `https://www.youtube.com/watch?v=${i.id.videoId}`,
        license: "Reproducción mediante el reproductor oficial de YouTube",
        attribution: i.snippet?.channelTitle ? `Video de ${i.snippet.channelTitle} en YouTube` : "YouTube",
        aiGenerated: false,
      })),
    };
  },
};

export const IMAGE_PROVIDERS = [unsplash, pexels, wikimedia];
export const VIDEO_PROVIDERS = [youtube];

export function mediaStatus() {
  return [...IMAGE_PROVIDERS, ...VIDEO_PROVIDERS].map((p) => ({ name: p.name, kind: p.kind, configured: p.configured() }));
}

function rowToItem(r: typeof schema.mediaAssets.$inferSelect): MediaItem {
  return {
    id: r.id,
    provider: r.provider,
    kind: r.kind as "image" | "video",
    url: r.url,
    thumbUrl: r.thumbUrl,
    width: r.width,
    height: r.height,
    title: r.title,
    author: r.author,
    authorUrl: r.authorUrl,
    sourceUrl: r.sourceUrl,
    license: r.license,
    attribution: r.attribution,
    aiGenerated: r.aiGenerated,
  };
}

/**
 * Busca medios con caché en base (30 días). Recorre proveedores configurados en orden
 * y devuelve también el estado de cada uno para mostrarlo en el panel.
 */
export async function findMedia(query: string, kind: "image" | "video", count = 6): Promise<{ items: MediaItem[]; statuses: { provider: string; status: string; error?: string }[] }> {
  const providers = kind === "image" ? IMAGE_PROVIDERS : VIDEO_PROVIDERS;
  const statuses: { provider: string; status: string; error?: string }[] = [];
  const q = query.trim().toLowerCase().slice(0, 120);
  for (const p of providers) {
    if (!p.configured()) {
      statuses.push({ provider: p.name, status: "not_configured" });
      continue;
    }
    const cached = await db().query.mediaQueries.findFirst({
      where: and(eq(schema.mediaQueries.query, q), eq(schema.mediaQueries.kind, kind), eq(schema.mediaQueries.provider, p.name)),
    });
    const fresh = cached && Date.now() - cached.fetchedAt.getTime() < TTL_DAYS * 86400000 * (cached.status === "error" ? 0.02 : 1);
    if (fresh && cached) {
      statuses.push({ provider: p.name, status: `${cached.status} (caché)`, error: cached.error ?? undefined });
      if (cached.status === "ok" && cached.assetIds.length) {
        const rows = await db().select().from(schema.mediaAssets).where(inArray(schema.mediaAssets.id, cached.assetIds));
        return { items: cached.assetIds.map((id) => rows.find((r) => r.id === id)).filter(Boolean).map((r) => rowToItem(r!)), statuses };
      }
      continue;
    }
    let result: ProviderResult;
    try {
      result = await p.search(query, count);
    } catch (e) {
      result = { status: "error", items: [], error: (e as Error).message };
    }
    const ids: string[] = [];
    for (let i = 0; i < result.items.length; i++) {
      const it = result.items[i];
      if (!it.url) continue;
      const [row] = await db()
        .insert(schema.mediaAssets)
        .values({ ...it, externalId: result.externalIds?.[i] ?? it.url })
        .onConflictDoUpdate({
          target: [schema.mediaAssets.provider, schema.mediaAssets.externalId],
          set: { url: it.url, thumbUrl: it.thumbUrl, attribution: it.attribution, license: it.license },
        })
        .returning({ id: schema.mediaAssets.id });
      ids.push(row.id);
    }
    await db()
      .insert(schema.mediaQueries)
      .values({ query: q, kind, provider: p.name, assetIds: ids, status: result.status, error: result.error ?? null })
      .onConflictDoUpdate({
        target: [schema.mediaQueries.query, schema.mediaQueries.kind, schema.mediaQueries.provider],
        set: { assetIds: ids, status: result.status, error: result.error ?? null, fetchedAt: sql`now()` },
      });
    statuses.push({ provider: p.name, status: result.status, error: result.error });
    if (ids.length) {
      const rows = await db().select().from(schema.mediaAssets).where(inArray(schema.mediaAssets.id, ids));
      return { items: ids.map((id) => rows.find((r) => r.id === id)).filter(Boolean).map((r) => rowToItem(r!)), statuses };
    }
  }
  return { items: [], statuses };
}
