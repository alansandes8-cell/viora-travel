import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

/** Qué pueden recorrer los buscadores: todo lo público; nunca el panel, los viajes privados ni la API. */
export default function robots(): MetadataRoute.Robots {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/viaje", "/viajes", "/continuar", "/p/", "/print/", "/opinar"] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
