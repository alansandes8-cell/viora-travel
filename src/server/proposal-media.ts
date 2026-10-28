import "server-only";
import { PHOTO_SPOTS } from "@/core/library/photo-spots";
import type { ClientProposal } from "@/core/sanitize";
import type { MediaItem } from "./integrations/media";
import { imagesFor, videosFor } from "./media-helpers";
import { loadLibrary } from "./settings";

/** Lugares a fotografiar de un destino: sus lugares emblemáticos o, si no hay, su búsqueda de imagen. */
export async function photoQueriesFor(stopName: string, country: string): Promise<string[]> {
  const dest = (await loadLibrary()).find((d) => d.name === stopName);
  const spots = dest?.photoSpots ?? (dest ? PHOTO_SPOTS[dest.id] : undefined);
  if (spots?.length) return spots;
  return [dest?.imageQuery ?? `${stopName} ${country}`];
}

/** Hasta `count` fotos de un destino, una por lugar emblemático (sin repetir). */
export async function destinationPhotos(stopName: string, country: string, count = 3): Promise<MediaItem[]> {
  const queries = (await photoQueriesFor(stopName, country)).slice(0, count);
  const perSpot = await Promise.all(queries.map((q) => imagesFor(q, queries.length === 1 ? count : 1)));
  const seen = new Set<string>();
  return perSpot.flat().filter((m) => !seen.has(m.url) && seen.add(m.url)).slice(0, count);
}

/** Medios de la propuesta: imágenes por parada y videos del destino principal. */
export async function proposalMedia(p: ClientProposal, opts: { videos?: boolean } = {}) {
  const it = p.itinerary;
  const stopImages: Record<string, MediaItem[]> = {};
  if (!it) return { stopImages, videos: [] as MediaItem[], videosConfigured: true };
  await Promise.all(
    it.stops.map(async (s) => {
      stopImages[s.id] = await destinationPhotos(s.name, s.country, 3);
    }),
  );
  let videos: MediaItem[] = [];
  let videosConfigured = true;
  if (opts.videos !== false) {
    const main = it.stops.reduce((a, b) => (b.nights > a.nights ? b : a));
    const v = await videosFor(`${main.name} ${main.country} viaje guía`, 2);
    videos = v.items;
    videosConfigured = v.configured;
  }
  return { stopImages, videos, videosConfigured };
}
