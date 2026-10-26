"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { logActivity } from "@/server/activity";
import { requireStaff } from "@/server/auth/session";
import { db, schema } from "@/server/db";
import { checkLinks, libraryUrls } from "@/server/link-check";
import { invalidateLibrary, loadLibrary } from "@/server/settings";

const months12 = z.array(z.number()).length(12);
const destinationShape = z
  .object({
    id: z.string().regex(/^[a-z0-9-]{2,40}$/),
    name: z.string().min(2),
    country: z.string().min(2),
    countryCode: z.string().length(2),
    cluster: z.string().min(2),
    kind: z.enum(["city", "beach", "nature", "resort", "themepark", "island"]),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    airports: z.array(z.string()),
    tags: z.record(z.string(), z.number().min(0).max(3)),
    nights: z.object({ min: z.number().int().min(1), ideal: z.number().int().min(1), max: z.number().int().min(1) }),
    costLevel: z.number().int().min(1).max(5),
    tranquility: z.number().int().min(1).max(5),
    familyFit: z.number().int().min(1).max(3),
    walking: z.number().int().min(1).max(3),
    climate: z.object({ hi: months12, rain: months12, sea: months12.optional() }),
    summary: z.string(),
    idealFor: z.string(),
    food: z.array(z.string()),
    lodgingZones: z.array(z.object({ name: z.string(), profile: z.string() })),
    highlights: z.array(z.object({ id: z.string(), name: z.string(), kind: z.string(), hours: z.number(), effort: z.number(), booking: z.enum(["required", "recommended", "no"]), tags: z.array(z.string()) }).passthrough()),
    imageQuery: z.string(),
  })
  .passthrough();

export async function saveDestination(id: string, _prev: unknown, fd: FormData) {
  const staff = await requireStaff("agent");
  let data: unknown;
  try {
    data = JSON.parse(String(fd.get("json") ?? ""));
  } catch {
    return { error: "JSON inválido." };
  }
  const parsed = destinationShape.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`).join(" · ") };
  if (parsed.data.id !== id) return { error: "No se puede cambiar el id." };
  await db().update(schema.destinations).set({ data: parsed.data, source: "agent", updatedAt: new Date() }).where(eq(schema.destinations.id, id));
  invalidateLibrary();
  await logActivity("library.updated", { actorKind: "staff", actorId: staff.id, details: { id } });
  revalidatePath("/admin/biblioteca");
  return { error: "", ok: true };
}

export async function toggleDestination(id: string) {
  await requireStaff("agent");
  const row = await db().query.destinations.findFirst({ where: eq(schema.destinations.id, id) });
  if (!row) return;
  await db().update(schema.destinations).set({ active: !row.active, updatedAt: new Date() }).where(eq(schema.destinations.id, id));
  invalidateLibrary();
  revalidatePath("/admin/biblioteca");
}

export async function runLinkCheck() {
  await requireStaff("agent");
  await checkLinks(libraryUrls(await loadLibrary()));
  revalidatePath("/admin/biblioteca");
}
