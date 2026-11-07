import "server-only";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { logActivity } from "../activity";
import { db, publicDb, schema } from "../db";
import { sendEmail } from "../integrations/notify";
import { clientIp, rateLimit } from "../security";
import { agency } from "../settings";

export const contactSchema = z
  .object({
    name: z.string().trim().min(2, "Contanos tu nombre.").max(80),
    email: z.string().trim().max(120).email("Revisá el email.").optional().or(z.literal("")),
    phone: z
      .string()
      .trim()
      .max(30)
      .regex(/^[+\d\s()-]{6,}$/, "Revisá el número de WhatsApp.")
      .optional()
      .or(z.literal("")),
    consent: z.literal(true, { message: "Necesitamos tu permiso para contactarte." }),
    message: z.string().trim().max(800).optional().default(""),
  })
  .refine((v) => !!v.email || !!v.phone, { message: "Dejanos un email o un WhatsApp.", path: ["email"] });

export const LEAD_KINDS: Record<string, string> = {
  flight: "Vuelos",
  hotel: "Hotel",
  activity: "Actividades",
  package: "Paquete armado",
  viorita: "Viorita (chat)",
  custom: "Viaje a medida",
};

export const LEAD_STATUS: Record<string, string> = { new: "Nuevo", contacted: "Contactado", quoted: "Cotizado", closed: "Cerrado" };

const leadInput = z.object({
  kind: z.enum(Object.keys(LEAD_KINDS) as [string, ...string[]]),
  summary: z.string().trim().min(3).max(300),
  details: z.record(z.string(), z.unknown()).default({}),
});

/** Guarda un pedido de cotización con los datos de contacto (con consentimiento) y avisa a la agencia. */
export async function createQuoteLead(raw: unknown, contactRaw: unknown): Promise<{ ok: true; clientId: string } | { ok: false; error: string }> {
  const lead = leadInput.safeParse(raw);
  if (!lead.success) return { ok: false, error: "Faltan datos del pedido. Volvé a buscar e intentá de nuevo." };
  const contact = contactSchema.safeParse(contactRaw);
  if (!contact.success) return { ok: false, error: contact.error.issues[0]?.message ?? "Revisá los datos." };
  if (!(await rateLimit(`quote:${await clientIp()}`, 12))) return { ok: false, error: "Recibimos muchos pedidos seguidos. Probá de nuevo en un rato." };
  const c = contact.data;
  const details = JSON.stringify(lead.data.details).length <= 8000 ? lead.data.details : { nota: "detalle demasiado largo" };
  const [client] = await db()
    .insert(schema.clients)
    .values({ name: c.name, email: c.email || null, phone: c.phone || null, consentContact: true, consentAt: new Date(), source: `cotizador:${lead.data.kind}` })
    .returning();
  const [row] = await db()
    .insert(schema.quoteLeads)
    .values({ clientId: client.id, kind: lead.data.kind, summary: lead.data.summary, details, message: c.message ?? "" })
    .returning({ id: schema.quoteLeads.id });
  await logActivity("quote.lead", { actorKind: "client", details: { leadId: row.id, kind: lead.data.kind, clientId: client.id } });
  if (agency.email()) {
    await sendEmail(
      agency.email(),
      `Pedido de cotización (${LEAD_KINDS[lead.data.kind]}): ${c.name}`,
      `${lead.data.summary}\n\nNombre: ${c.name}\nEmail: ${c.email || "-"}\nWhatsApp: ${c.phone || "-"}\nMensaje: ${c.message || "-"}\n\nVer en el panel: ${agency.appUrl()}/admin/consultas`,
    ).catch(() => {});
  }
  return { ok: true, clientId: client.id };
}

/** Lead interno (sin datos de contacto nuevos): lo usa Viorita, que ya creó el cliente. */
export async function recordLead(clientId: string, kind: string, summary: string, details: Record<string, unknown>, message = ""): Promise<void> {
  await db().insert(schema.quoteLeads).values({ clientId, kind, summary: summary.slice(0, 300), details, message: message.slice(0, 800) });
}

export async function listQuoteLeads(limit = 200) {
  return db()
    .select({ l: schema.quoteLeads, client: schema.clients })
    .from(schema.quoteLeads)
    .leftJoin(schema.clients, eq(schema.clients.id, schema.quoteLeads.clientId))
    .orderBy(desc(schema.quoteLeads.createdAt))
    .limit(limit);
}

export async function setLeadStatus(id: string, status: string): Promise<void> {
  if (!LEAD_STATUS[status] || !/^[0-9a-f-]{36}$/i.test(id)) return;
  await db().update(schema.quoteLeads).set({ status, updatedAt: new Date() }).where(eq(schema.quoteLeads.id, id));
}

// ───────────────────────── Opiniones ─────────────────────────

export type PublicTestimonial = { id: string; name: string; city: string; trip: string; text: string; rating: number };

/** Opiniones aprobadas (rol público, solo columnas publicables). */
export async function approvedTestimonials(limit = 9): Promise<PublicTestimonial[]> {
  const t = schema.testimonials;
  try {
    return await publicDb()
      .select({ id: t.id, name: t.name, city: t.city, trip: t.trip, text: t.text, rating: t.rating })
      .from(t)
      .where(eq(t.status, "approved"))
      .orderBy(desc(t.createdAt))
      .limit(limit);
  } catch {
    return [];
  }
}

export const testimonialSchema = z.object({
  name: z.string().trim().min(2, "Contanos tu nombre.").max(60),
  city: z.string().trim().max(60).default(""),
  trip: z.string().trim().min(2, "Contanos a dónde viajaste.").max(80),
  text: z.string().trim().min(20, "Contanos un poco más (al menos 20 caracteres).").max(600),
  rating: z.coerce.number().int().min(1).max(5),
  contact: z.string().trim().max(120).optional().default(""),
  consent: z.literal(true, { message: "Necesitamos tu permiso para publicarla." }),
});

/** Opinión enviada por un cliente: queda pendiente hasta que la agencia la apruebe. */
export async function submitTestimonial(raw: unknown): Promise<{ ok: boolean; error?: string }> {
  const p = testimonialSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Revisá los datos." };
  if (!(await rateLimit(`testimonial:${await clientIp()}`, 5))) return { ok: false, error: "Probá de nuevo en un rato." };
  const v = p.data;
  await db().insert(schema.testimonials).values({ name: v.name, city: v.city, trip: v.trip, text: v.text, rating: v.rating, contact: v.contact || null, source: "cliente", status: "pending" });
  await logActivity("testimonial.submitted", { actorKind: "client", details: { name: v.name } });
  if (agency.email()) await sendEmail(agency.email(), `Nueva opinión de ${v.name}`, `${v.text}\n\nAprobala en ${agency.appUrl()}/admin/opiniones`).catch(() => {});
  return { ok: true };
}

export async function allTestimonials() {
  return db().select().from(schema.testimonials).orderBy(desc(schema.testimonials.createdAt));
}

export async function addTestimonial(raw: unknown): Promise<{ ok: boolean; error?: string }> {
  const p = testimonialSchema.omit({ consent: true }).safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Revisá los datos." };
  const v = p.data;
  await db().insert(schema.testimonials).values({ name: v.name, city: v.city, trip: v.trip, text: v.text, rating: v.rating, contact: v.contact || null, source: "agencia", status: "approved" });
  return { ok: true };
}

export async function setTestimonialStatus(id: string, status: "approved" | "hidden" | "pending" | "delete"): Promise<void> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  if (status === "delete") await db().delete(schema.testimonials).where(eq(schema.testimonials.id, id));
  else await db().update(schema.testimonials).set({ status }).where(eq(schema.testimonials.id, id));
}
