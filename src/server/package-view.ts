import "server-only";
import type { Destination } from "@/core/types";
import type { MediaItem } from "./integrations/media";
import { coverPhoto } from "./proposal-media";
import { loadLibrary } from "./settings";
import type { PackageRow } from "./services/packages";

const SYMBOL: Record<string, string> = { USD: "US$", EUR: "€", ARS: "$" };

/** «US$ 1.890» o null si la agencia todavía no cargó el precio. */
export function packagePrice(p: Pick<PackageRow, "priceFrom" | "currency">): string | null {
  if (p.priceFrom === null || p.priceFrom === undefined) return null;
  const n = Number(p.priceFrom);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `${SYMBOL[p.currency] ?? p.currency} ${n.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

/** Foto propia de la agencia (si cargó un enlace) o la primera foto real del primer destino. */
export async function packageCover(p: PackageRow, library?: Destination[]): Promise<MediaItem | null> {
  if (p.imageUrl) {
    return { id: `pkg-${p.id}`, provider: "agency", kind: "image", url: p.imageUrl, thumbUrl: null, width: null, height: null, title: p.title, author: null, authorUrl: null, sourceUrl: null, license: null, attribution: null, aiGenerated: false };
  }
  const lib = library ?? (await loadLibrary());
  const main = p.stops.reduce<{ destinationId: string; nights: number } | null>((a, s) => (!a || s.nights > a.nights ? s : a), null);
  const d = main ? lib.find((x) => x.id === main.destinationId) : null;
  if (!d) return null;
  return (await coverPhoto(d.name, d.country, d.imageQuery))[0] ?? null;
}

/** Tipo de paisaje del destino principal (para la postal ilustrada de respaldo). */
export function packageKind(p: Pick<PackageRow, "stops">, library: Destination[]): Destination["kind"] {
  const main = p.stops.reduce<{ destinationId: string; nights: number } | null>((a, s) => (!a || s.nights > a.nights ? s : a), null);
  return library.find((d) => d.id === main?.destinationId)?.kind ?? "city";
}

export function packageNights(p: Pick<PackageRow, "stops">): number {
  return p.stops.reduce((a, s) => a + s.nights, 0);
}
