import "server-only";
import type { ClientProposal } from "@/core/sanitize";
import type { MediaItem } from "./integrations/media";
import { imagesFor, videosFor } from "./media-helpers";

/** Medios de la propuesta: imágenes por parada y videos del destino principal. */
export async function proposalMedia(p: ClientProposal, opts: { videos?: boolean } = {}) {
  const it = p.itinerary;
  const stopImages: Record<string, MediaItem[]> = {};
  if (!it) return { stopImages, videos: [] as MediaItem[], videosConfigured: true };
  await Promise.all(
    it.stops.map(async (s) => {
      stopImages[s.id] = await imagesFor(`${s.name} ${s.country}`, 3);
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
