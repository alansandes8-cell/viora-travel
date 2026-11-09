import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { SUPER_REGION } from "@/core/library";
import { buildPlan, isIsoDate, isItemKind } from "@/core/my-trip";
import { normalize } from "@/core/text";
import { db, schema } from "../db";
import { loadLibrary } from "../settings";

export type BookedTrip = typeof schema.bookedTrips.$inferSelect;
export type TripItem = typeof schema.tripItems.$inferSelect;
export type PlanDay = schema.PlanDay;

const UUID = /^[0-9a-f-]{36}$/i;

// ───────────────────────── Lectura ─────────────────────────

/** Viajes publicados de un cliente (lo que ve en «Mi viaje»). */
export async function tripsForClient(clientId: string): Promise<BookedTrip[]> {
  return db()
    .select()
    .from(schema.bookedTrips)
    .where(and(eq(schema.bookedTrips.clientId, clientId), eq(schema.bookedTrips.status, "published")))
    .orderBy(asc(schema.bookedTrips.startDate));
}

/** Un viaje con sus servicios y archivos, solo si pertenece al cliente (o si `clientId` es null: equipo). */
export async function tripBundle(tripId: string, clientId: string | null) {
  if (!UUID.test(tripId)) return null;
  const trip = await db().query.bookedTrips.findFirst({ where: eq(schema.bookedTrips.id, tripId) });
  if (!trip) return null;
  if (clientId !== null && (trip.clientId !== clientId || trip.status !== "published")) return null;
  const [items, files] = await Promise.all([
    db().select().from(schema.tripItems).where(eq(schema.tripItems.tripId, tripId)).orderBy(asc(schema.tripItems.startDate), asc(schema.tripItems.startTime), asc(schema.tripItems.sort)),
    db()
      .select({ id: schema.tripFiles.id, itemId: schema.tripFiles.itemId, filename: schema.tripFiles.filename, mime: schema.tripFiles.mime, size: schema.tripFiles.size })
      .from(schema.tripFiles)
      .where(eq(schema.tripFiles.tripId, tripId))
      .orderBy(asc(schema.tripFiles.createdAt)),
  ]);
  return { trip, items, files };
}

/** Archivo de voucher, solo para el dueño del viaje publicado o para el equipo. */
export async function tripFileFor(fileId: string, clientId: string | null) {
  if (!UUID.test(fileId)) return null;
  const rows = await db()
    .select({ f: schema.tripFiles, t: schema.bookedTrips })
    .from(schema.tripFiles)
    .innerJoin(schema.bookedTrips, eq(schema.bookedTrips.id, schema.tripFiles.tripId))
    .where(eq(schema.tripFiles.id, fileId))
    .limit(1);
  const r = rows[0];
  if (!r) return null;
  if (clientId !== null && (r.t.clientId !== clientId || r.t.status !== "published")) return null;
  return r.f;
}

export async function allBookedTrips() {
  return db()
    .select({ t: schema.bookedTrips, client: schema.clients })
    .from(schema.bookedTrips)
    .leftJoin(schema.clients, eq(schema.clients.id, schema.bookedTrips.clientId))
    .orderBy(desc(schema.bookedTrips.startDate));
}

// ───────────────────────── Edición (equipo) ─────────────────────────

const tripInput = z
  .object({
    title: z.string().trim().min(2).max(80),
    subtitle: z.string().trim().max(80).default(""),
    startDate: z.string().refine(isIsoDate, "Fecha de inicio inválida."),
    endDate: z.string().refine(isIsoDate, "Fecha de regreso inválida."),
    travelers: z.string().trim().max(200).default(""),
    coverPlace: z.string().trim().max(120).default(""),
    europaGo: z.boolean(),
    assistance: z.string().trim().max(400).default(""),
    notes: z.string().trim().max(2000).default(""),
    status: z.enum(["draft", "published"]),
  })
  .refine((v) => v.endDate >= v.startDate, { message: "El regreso tiene que ser después de la salida.", path: ["endDate"] })
  .refine((v) => v.endDate <= `${Number(v.startDate.slice(0, 4)) + 1}${v.startDate.slice(4)}`, { message: "El viaje no puede durar más de un año.", path: ["endDate"] });

export function parseTripForm(fd: FormData) {
  return tripInput.safeParse({
    title: fd.get("title") || "Plan de viaje",
    subtitle: fd.get("subtitle") ?? "",
    startDate: fd.get("startDate"),
    endDate: fd.get("endDate"),
    travelers: fd.get("travelers") ?? "",
    coverPlace: fd.get("coverPlace") ?? "",
    europaGo: fd.get("europaGo") === "on",
    assistance: fd.get("assistance") ?? "",
    notes: fd.get("notes") ?? "",
    status: fd.get("status") === "published" ? "published" : "draft",
  });
}

export async function createTrip(clientId: string, data: z.infer<typeof tripInput>): Promise<string> {
  const [row] = await db().insert(schema.bookedTrips).values({ clientId, ...data }).returning({ id: schema.bookedTrips.id });
  return row.id;
}

export async function updateTrip(id: string, data: z.infer<typeof tripInput>): Promise<void> {
  await db().update(schema.bookedTrips).set({ ...data, updatedAt: new Date() }).where(eq(schema.bookedTrips.id, id));
}

export async function deleteTrip(id: string): Promise<void> {
  if (UUID.test(id)) await db().delete(schema.bookedTrips).where(eq(schema.bookedTrips.id, id));
}

const optDate = z
  .string()
  .optional()
  .transform((v) => (v && isIsoDate(v) ? v : null));
const time = z
  .string()
  .optional()
  .transform((v) => (v && /^\d{1,2}:\d{2}$/.test(v) ? v.padStart(5, "0") : ""));
const httpsUrl = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((u) => !u || /^https:\/\//.test(u), "Los enlaces tienen que empezar con https://")
    .default("");

const itemInput = z.object({
  kind: z.string().refine(isItemKind, "Tipo inválido."),
  title: z.string().trim().min(2, "Poné un nombre.").max(160),
  provider: z.string().trim().max(120).default(""),
  startDate: optDate,
  startTime: time,
  endDate: optDate,
  endTime: time,
  place: z.string().trim().max(120).default(""),
  address: z.string().trim().max(300).default(""),
  confirmation: z.string().trim().max(120).default(""),
  details: z.string().trim().max(2000).default(""),
  breakfast: z.boolean().nullable(),
  rating: z.string().trim().max(20).default(""),
  price: z.number().min(0).max(10_000_000).nullable(),
  currency: z.enum(["USD", "EUR", "ARS"]),
  photos: z.array(httpsUrl(500)).max(6),
  voucherUrl: httpsUrl(500),
});

export function parseItemForm(fd: FormData) {
  const price = String(fd.get("price") ?? "").replace(/\./g, "").replace(",", ".").trim();
  const b = fd.get("breakfast");
  return itemInput.safeParse({
    kind: fd.get("kind"),
    title: fd.get("title"),
    provider: fd.get("provider") ?? "",
    startDate: fd.get("startDate") || undefined,
    startTime: fd.get("startTime") || undefined,
    endDate: fd.get("endDate") || undefined,
    endTime: fd.get("endTime") || undefined,
    place: fd.get("place") ?? "",
    address: fd.get("address") ?? "",
    confirmation: fd.get("confirmation") ?? "",
    details: fd.get("details") ?? "",
    breakfast: b === "yes" ? true : b === "no" ? false : null,
    rating: fd.get("rating") ?? "",
    price: price && Number.isFinite(Number(price)) ? Number(price) : null,
    currency: fd.get("currency") ?? "USD",
    photos: String(fd.get("photos") ?? "")
      .split(/\s+/)
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 6),
    voucherUrl: fd.get("voucherUrl") ?? "",
  });
}

export async function saveItem(tripId: string, itemId: string | null, data: z.infer<typeof itemInput>): Promise<string> {
  const values = { ...data, price: data.price === null ? null : String(data.price) };
  if (itemId && UUID.test(itemId)) {
    await db().update(schema.tripItems).set(values).where(and(eq(schema.tripItems.id, itemId), eq(schema.tripItems.tripId, tripId)));
    return itemId;
  }
  const [row] = await db().insert(schema.tripItems).values({ tripId, ...values }).returning({ id: schema.tripItems.id });
  return row.id;
}

export async function deleteItem(tripId: string, itemId: string): Promise<void> {
  if (UUID.test(itemId)) await db().delete(schema.tripItems).where(and(eq(schema.tripItems.id, itemId), eq(schema.tripItems.tripId, tripId)));
}

export const MAX_FILE = 10 * 1024 * 1024;
export const FILE_TYPES: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Comprueba la firma real del archivo (no alcanza con el tipo que declara el navegador). */
export function sniffMime(buf: Buffer): string | null {
  if (buf.subarray(0, 4).toString("latin1") === "%PDF") return "application/pdf";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  return null;
}

export async function addFile(tripId: string, itemId: string | null, filename: string, buf: Buffer): Promise<{ ok: true } | { ok: false; error: string }> {
  if (buf.length > MAX_FILE) return { ok: false, error: "El archivo pesa más de 10 MB." };
  const mime = sniffMime(buf);
  if (!mime) return { ok: false, error: "Solo se aceptan PDF, JPG, PNG o WEBP." };
  const safe = filename.replace(/[^\w.\- áéíóúñÁÉÍÓÚÑ]/g, "_").slice(0, 120) || `voucher.${FILE_TYPES[mime]}`;
  await db()
    .insert(schema.tripFiles)
    .values({ tripId, itemId: itemId && UUID.test(itemId) ? itemId : null, filename: safe, mime, size: buf.length, data: buf });
  return { ok: true };
}

export async function deleteFile(tripId: string, fileId: string): Promise<void> {
  if (UUID.test(fileId)) await db().delete(schema.tripFiles).where(and(eq(schema.tripFiles.id, fileId), eq(schema.tripFiles.tripId, tripId)));
}

// ───────────────────────── Plan diario ─────────────────────────

const entryInput = z.object({
  time: z
    .string()
    .max(5)
    .transform((v) => (/^\d{1,2}:\d{2}$/.test(v) ? v.padStart(5, "0") : "")),
  title: z.string().trim().max(160),
  text: z.string().trim().max(1000),
  link: httpsUrl(500),
  photo: z.string().trim().max(500),
  itemId: z.string().max(36).default(""),
});
const dayInput = z.object({
  date: z.string().refine(isIsoDate),
  city: z.string().trim().max(80),
  countryCode: z
    .string()
    .trim()
    .max(2)
    .transform((v) => v.toUpperCase()),
  summary: z.string().trim().max(120),
  entries: z.array(entryInput).max(15),
});
export const planInput = z.array(dayInput).max(120);

/**
 * `touch`: marca el viaje como modificado (hace que el editor del panel recargue el plan).
 * Al guardar desde el propio editor no hace falta: ya tiene los datos.
 */
export async function savePlan(tripId: string, plan: z.infer<typeof planInput>, touch = true): Promise<void> {
  const clean = plan.map((d) => ({ ...d, entries: d.entries.filter((e) => e.title || e.text) }));
  await db()
    .update(schema.bookedTrips)
    .set(touch ? { plan: clean, updatedAt: new Date() } : { plan: clean })
    .where(eq(schema.bookedTrips.id, tripId));
}

/** Código de país de una ciudad según la biblioteca (para la bandera del cronograma). */
export async function countryResolver(): Promise<(place: string) => string> {
  const library = await loadLibrary();
  return (place: string) => {
    const n = normalize(place);
    return library.find((d) => normalize(d.name) === n || n.startsWith(normalize(d.name)))?.countryCode ?? "";
  };
}

/** Completa el plan: un día por fecha, ciudad según el hotel y vuelos/traslados/actividades del día. */
export async function autoPlan(tripId: string): Promise<void> {
  const b = await tripBundle(tripId, null);
  if (!b) return;
  const plan = buildPlan(b.trip.startDate, b.trip.endDate, b.trip.plan, b.items, await countryResolver());
  await savePlan(tripId, plan as z.infer<typeof planInput>);
}

/** ¿Algún destino del viaje está en Europa? (para sugerir Europa Go). */
export async function looksEuropean(places: string[]): Promise<boolean> {
  const library = await loadLibrary();
  return places.some((p) => {
    const d = library.find((x) => normalize(x.name) === normalize(p));
    return d ? SUPER_REGION[d.cluster] === "europa" : false;
  });
}

export const EUROPA_GO_URL = () => process.env.EUROPA_GO_URL || "https://magenta-malasada-609f45.netlify.app/#/";
