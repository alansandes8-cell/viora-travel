import "server-only";
import { PHOTO_SPOTS } from "@/core/library/photo-spots";
import type { ClientProposal } from "@/core/sanitize";
import type { MediaItem } from "./integrations/media";
import { firstImage, imagesFor, videosFor } from "./media-helpers";
import { loadLibrary } from "./settings";

/** Lugares a fotografiar de un destino: sus lugares emblemáticos o, si no hay, su búsqueda de imagen. */
export async function photoQueriesFor(stopName: string, country: string): Promise<string[]> {
  const dest = (await loadLibrary()).find((d) => d.name === stopName);
  const spots = dest?.photoSpots ?? (dest ? PHOTO_SPOTS[dest.id] : undefined);
  if (spots?.length) return spots;
  return [dest?.imageQuery ?? `${stopName} ${country}`];
}

/** Foto de portada de una alternativa: la primera foto real entre los lugares emblemáticos de su destino principal. */
export async function coverPhoto(stopName: string, country: string, fallbackQuery?: string): Promise<MediaItem[]> {
  const queries = await photoQueriesFor(stopName, country);
  const img = await firstImage(fallbackQuery && !queries.includes(fallbackQuery) ? [...queries, fallbackQuery] : queries);
  return img ? [img] : [];
}

/** Hasta `count` fotos de un destino, una por lugar emblemático (sin repetir). */
export async function destinationPhotos(stopName: string, country: string, count = 3): Promise<MediaItem[]> {
  const queries = (await photoQueriesFor(stopName, country)).slice(0, count);
  const perSpot = await Promise.all(queries.map((q) => imagesFor(q, queries.length === 1 ? count : 1)));
  const seen = new Set<string>();
  return perSpot.flat().filter((m) => !seen.has(m.url) && seen.add(m.url)).slice(0, count);
}

const GENERIC_ZONE = /^(centro|centro historico|centro storico|ciudad|ciudad vieja|old town|new town|altstadt|downtown|riverside|laderas|innere stadt|hoteles)\b/i;

/** Búsqueda de foto para una zona de alojamiento («Sol / Centro», Madrid → «Sol Madrid»). Si es genérica, null. */
function zoneQuery(zone: string, city: string): string | null {
  const plain = zone.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (GENERIC_ZONE.test(plain)) return null;
  const inner = zone.match(/\(([^)]+)\)/)?.[1];
  const first = (inner && !/lago|siracusa/i.test(inner) ? inner : zone.replace(/\(.*?\)/g, "")).split(/[\/,]/)[0].trim();
  return first.length > 2 ? `${first} ${city.split(/[:(]/)[0].trim()}` : null;
}

/** Una foto de cada zona sugerida para alojarse (la zona, no un hotel). */
async function zonePhotos(p: ClientProposal): Promise<Record<string, MediaItem[]>> {
  const it = p.itinerary;
  const out: Record<string, MediaItem[]> = {};
  if (!it) return out;
  await Promise.all(
    it.lodging.map(async (l) => {
      const stop = it.stops.find((s) => s.id === l.stopId);
      if (!stop) return;
      const q = zoneQuery(l.zone, stop.name);
      out[l.stopId] = q ? await imagesFor(q, 1, 2500) : [];
    }),
  );
  return out;
}

/** Medios de la propuesta: imágenes por parada, de las zonas de alojamiento y videos del destino principal. */
export async function proposalMedia(p: ClientProposal, opts: { videos?: boolean } = {}) {
  const it = p.itinerary;
  const stopImages: Record<string, MediaItem[]> = {};
  if (!it) return { stopImages, zoneImages: {} as Record<string, MediaItem[]>, videos: [] as MediaItem[], videosConfigured: true };
  const [, zoneImages] = await Promise.all([
    Promise.all(
      it.stops.map(async (s) => {
        stopImages[s.id] = await destinationPhotos(s.name, s.country, 3);
      }),
    ),
    zonePhotos(p),
  ]);
  let videos: MediaItem[] = [];
  let videosConfigured = true;
  if (opts.videos !== false) {
    const main = it.stops.reduce((a, b) => (b.nights > a.nights ? b : a));
    const v = await videosFor(`${main.name} ${main.country} viaje guía`, 2);
    videos = v.items;
    videosConfigured = v.configured;
  }
  return { stopImages, zoneImages, videos, videosConfigured };
}
