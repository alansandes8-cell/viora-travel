import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { PACKAGE_CATEGORIES, slugify } from "@/core/packages";
import { db, publicDb, schema } from "../db";
import { loadLibrary } from "../settings";

export type PackageRow = typeof schema.packages.$inferSelect;

/** Paquetes publicados (páginas públicas: rol de base restringido). */
export async function publishedPackages(): Promise<PackageRow[]> {
  return publicDb().select().from(schema.packages).where(eq(schema.packages.status, "published")).orderBy(asc(schema.packages.sort), asc(schema.packages.title));
}

export async function publishedPackage(slug: string): Promise<PackageRow | null> {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  const [row] = await publicDb()
    .select()
    .from(schema.packages)
    .where(and(eq(schema.packages.slug, slug), eq(schema.packages.status, "published")));
  return row ?? null;
}

// ───────────────────────── Panel ─────────────────────────

export async function allPackages(): Promise<PackageRow[]> {
  return db().select().from(schema.packages).orderBy(asc(schema.packages.sort), asc(schema.packages.title));
}

export async function packageById(id: string): Promise<PackageRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return (await db().query.packages.findFirst({ where: eq(schema.packages.id, id) })) ?? null;
}

const lines = (v: unknown) =>
  String(v ?? "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 20);

export const packageInput = z.object({
  title: z.string().trim().min(3, "Poné un título.").max(120),
  slug: z.string().trim().max(80).optional(),
  category: z.enum(PACKAGE_CATEGORIES.map((c) => c.id) as [string, ...string[]]),
  summary: z.string().trim().max(400).default(""),
  stops: z.array(z.object({ destinationId: z.string().min(1).max(60), nights: z.coerce.number().int().min(1).max(60) })).min(1, "Agregá al menos un destino.").max(8),
  includes: z.array(z.string().max(160)).max(20),
  excludes: z.array(z.string().max(160)).max(20),
  priceFrom: z.coerce.number().min(0).max(1_000_000).nullable(),
  currency: z.enum(["USD", "EUR", "ARS"]),
  priceNote: z.string().trim().max(120).default(""),
  departures: z.string().trim().max(300).default(""),
  imageUrl: z
    .string()
    .trim()
    .max(500)
    .refine((u) => !u || /^https:\/\//.test(u), "La foto debe ser un enlace https://")
    .nullable(),
  status: z.enum(["draft", "published"]),
  sort: z.coerce.number().int().min(0).max(10_000),
});

/** Convierte el formulario del panel en datos validados (destinos solo de la biblioteca). */
export async function parsePackageForm(fd: FormData): Promise<{ ok: true; data: z.infer<typeof packageInput> } | { ok: false; error: string }> {
  const library = await loadLibrary();
  const ids = fd.getAll("stop_dest").map(String);
  const nights = fd.getAll("stop_nights").map(String);
  const stops = ids.map((d, i) => ({ destinationId: d, nights: nights[i] })).filter((s) => s.destinationId);
  if (stops.some((s) => !library.some((d) => d.id === s.destinationId))) return { ok: false, error: "Hay un destino que no está en la biblioteca." };
  const price = String(fd.get("priceFrom") ?? "").replace(/\./g, "").replace(",", ".").trim();
  const parsed = packageInput.safeParse({
    title: fd.get("title"),
    slug: fd.get("slug") || undefined,
    category: fd.get("category"),
    summary: fd.get("summary") ?? "",
    stops,
    includes: lines(fd.get("includes")),
    excludes: lines(fd.get("excludes")),
    priceFrom: price ? price : null,
    currency: fd.get("currency") ?? "USD",
    priceNote: fd.get("priceNote") ?? "",
    departures: fd.get("departures") ?? "",
    imageUrl: String(fd.get("imageUrl") ?? "").trim() || null,
    status: fd.get("status") === "published" ? "published" : "draft",
    sort: fd.get("sort") || 100,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  return { ok: true, data: parsed.data };
}

export async function savePackage(id: string | null, data: z.infer<typeof packageInput>): Promise<{ ok: boolean; id?: string; error?: string }> {
  const slug = slugify(data.slug || data.title) || `paquete-${Date.now()}`;
  const values = {
    slug,
    title: data.title,
    category: data.category,
    summary: data.summary,
    stops: data.stops,
    includes: data.includes,
    excludes: data.excludes,
    priceFrom: data.priceFrom === null ? null : String(data.priceFrom),
    currency: data.currency,
    priceNote: data.priceNote,
    departures: data.departures,
    imageUrl: data.imageUrl,
    status: data.status,
    sort: data.sort,
    updatedAt: new Date(),
  };
  try {
    if (id) {
      await db().update(schema.packages).set(values).where(eq(schema.packages.id, id));
      return { ok: true, id };
    }
    const [row] = await db().insert(schema.packages).values(values).returning({ id: schema.packages.id });
    return { ok: true, id: row.id };
  } catch {
    return { ok: false, error: "Ya existe un paquete con esa dirección (slug). Cambiá el título o el slug." };
  }
}

export async function deletePackage(id: string): Promise<void> {
  await db().delete(schema.packages).where(eq(schema.packages.id, id));
}
