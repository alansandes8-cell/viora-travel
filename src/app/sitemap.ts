import type { MetadataRoute } from "next";
import { publishedPackages } from "@/server/services/packages";
import { loadLibrary } from "@/server/settings";

export const dynamic = "force-dynamic";

/** Mapa del sitio para Google: páginas principales, guías de destinos y paquetes publicados. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const now = new Date();
  const [library, packages] = await Promise.all([loadLibrary(), publishedPackages().catch(() => [])]);
  const main: [string, number][] = [
    ["", 1],
    ["/paquetes", 0.9],
    ["/destinos", 0.9],
    ["/planificar", 0.8],
    ["/vuelos", 0.8],
    ["/hoteles", 0.7],
    ["/actividades", 0.7],
    ["/app", 0.4],
    ["/privacidad", 0.2],
    ["/terminos", 0.2],
  ];
  return [
    ...main.map(([path, priority]) => ({ url: `${base}${path}`, lastModified: now, changeFrequency: "weekly" as const, priority })),
    ...library.map((d) => ({ url: `${base}/destinos/${d.id}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...packages.map((p) => ({ url: `${base}/paquetes/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
