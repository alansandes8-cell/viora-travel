import "server-only";
import { createHash } from "node:crypto";
import { and, desc, eq, like, sql } from "drizzle-orm";
import { MONTHS_ES } from "@/core/catalog";
import { modeLabel } from "@/core/itinerary";
import type { QuoteCategory } from "@/core/pricing";
import { toClientProposal, type ClientProposal } from "@/core/sanitize";
import type { IntakeAnswers, PlanDocument } from "@/core/types";
import { logActivity } from "../activity";
import { db, publicDb, schema } from "../db";
import { hashToken, newToken } from "../security";
import { getSetting } from "../settings";

export async function nextProjectCode(): Promise<string> {
  const year = new Date().getFullYear();
  const [row] = await db()
    .select({ max: sql<string | null>`max(${schema.tripProjects.code})` })
    .from(schema.tripProjects)
    .where(like(schema.tripProjects.code, `VIO-${year}-%`));
  const n = row?.max ? parseInt(row.max.split("-")[2], 10) + 1 : 1;
  return `VIO-${year}-${String(n).padStart(4, "0")}`;
}

export function summarize(doc: PlanDocument, answers: IntakeAnswers) {
  const alt = doc.alternatives.find((a) => a.id === doc.selectedAlternativeId);
  const dates =
    answers.dates.mode === "exact"
      ? `${answers.dates.departure} → ${answers.dates.return}`
      : answers.dates.mode === "month" && answers.dates.months?.length
        ? `${answers.dates.months.map((m) => MONTHS_ES[m - 1]).join(", ")}${doc.profile.nights ? ` · ${doc.profile.nights} noches` : ""}`
        : doc.profile.nights
          ? `Sin fecha · ${doc.profile.nights} noches`
          : "Sin fecha";
  return {
    destinationSummary: alt ? alt.stops.map((s) => s.name).join(" · ") : "Sin alternativas",
    tentativeDates: dates,
    travelers: doc.profile.travelers,
    budgetTier: doc.profile.budgetTier,
  };
}

export async function createVersion(opts: {
  projectId: string;
  doc: PlanDocument;
  authorKind: "engine" | "ai" | "agent" | "client";
  authorUserId?: string | null;
  reason: string;
  summary?: string[];
  parentId?: string | null;
  status?: "draft" | "approved";
}) {
  return db().transaction(async (tx) => {
    const [row] = await tx
      .select({ max: sql<number>`coalesce(max(${schema.planVersions.number}), 0)::int` })
      .from(schema.planVersions)
      .where(eq(schema.planVersions.projectId, opts.projectId));
    const [v] = await tx
      .insert(schema.planVersions)
      .values({
        projectId: opts.projectId,
        number: (row?.max ?? 0) + 1,
        parentId: opts.parentId ?? null,
        authorKind: opts.authorKind,
        authorUserId: opts.authorUserId ?? null,
        reason: opts.reason,
        document: opts.doc,
        status: opts.status ?? "draft",
        changeSummary: opts.summary ?? [],
      })
      .returning();
    await tx
      .update(schema.tripProjects)
      .set({ currentVersionId: v.id, updatedAt: new Date() })
      .where(eq(schema.tripProjects.id, opts.projectId));
    return v;
  });
}

/** Publica una instantánea saneada (sin precios) para el cliente y la marca como versión visible. */
export async function publishClientSnapshot(projectId: string, versionId: string, status: ClientProposal["status"]) {
  const version = await db().query.planVersions.findFirst({ where: eq(schema.planVersions.id, versionId) });
  if (!version || version.projectId !== projectId) throw new Error("Versión inexistente");
  const content = toClientProposal(version.document, status); // lanza si detecta importes
  const contentHash = createHash("sha256").update(JSON.stringify(content)).digest("hex");
  const [snap] = await db()
    .insert(schema.clientSnapshots)
    .values({ projectId, versionId, kind: "client_proposal", content, contentHash })
    .returning();
  await db().update(schema.tripProjects).set({ publishedVersionId: versionId, updatedAt: new Date() }).where(eq(schema.tripProjects.id, projectId));
  return snap;
}

export async function createShareLink(projectId: string, snapshotId: string, kind: "client_proposal" | "priced_proposal", createdBy: string, days?: number) {
  const token = newToken(24);
  const ttl = days ?? (await getSetting<number>("share_link_days", 90));
  const [link] = await db()
    .insert(schema.shareLinks)
    .values({ projectId, snapshotId, kind, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + ttl * 86400000), createdBy })
    .returning();
  await logActivity("share_link.created", { projectId, actorKind: createdBy.startsWith("staff") ? "staff" : "client", actorId: createdBy, details: { kind, days: ttl } });
  return { token, link };
}

/** Lectura pública de un enlace compartido. Usa el rol restringido de base de datos. */
export async function resolveShareLink(token: string) {
  if (!token || token.length < 20 || token.length > 100) return null;
  const pdb = publicDb();
  const link = await pdb.query.shareLinks.findFirst({
    columns: { id: true, projectId: true, snapshotId: true, kind: true, expiresAt: true, revokedAt: true },
    where: eq(schema.shareLinks.tokenHash, hashToken(token)),
  });
  if (!link || link.revokedAt || link.expiresAt < new Date()) return null;
  const snap = await pdb.query.clientSnapshots.findFirst({ where: eq(schema.clientSnapshots.id, link.snapshotId) });
  if (!snap) return null;
  await pdb
    .update(schema.shareLinks)
    .set({ lastAccessAt: new Date(), accessCount: sql`${schema.shareLinks.accessCount} + 1` })
    .where(eq(schema.shareLinks.id, link.id))
    .catch(() => {});
  return { kind: link.kind, snapshotId: snap.id, content: snap.content, createdAt: snap.createdAt, expiresAt: link.expiresAt };
}

/** Tareas de cotización sugeridas, adaptadas al viaje. Quedan bajo control del agente. */
export function suggestedTasks(doc: PlanDocument): { title: string; detail?: string }[] {
  const it = doc.itinerary;
  const tasks: { title: string; detail?: string }[] = [];
  if (doc.profile.exploratory) tasks.push({ title: "Confirmar fechas con el cliente", detail: "La propuesta es exploratoria (sin fechas confirmadas)." });
  if (!it) return [...tasks, { title: "Investigar alternativas manualmente", detail: "El motor no encontró opciones en la biblioteca." }];
  const origin = it.flights.originAirports[0] ?? doc.profile.originLabel;
  tasks.push({
    title: `Verificar vuelos ${origin} → ${it.flights.destinationAirports[0] ?? it.stops[0].name} y regreso desde ${it.flights.returnAirports[0] ?? it.stops[it.stops.length - 1].name}`,
    detail: `Para ${doc.profile.travelers} viajero(s). Comparar opciones con y sin escalas.`,
  });
  tasks.push({ title: "Investigar equipaje y condiciones tarifarias de los vuelos" });
  for (const s of it.stops) tasks.push({ title: `Consultar alojamiento en ${s.name} (${s.lodgingZone ?? "zona a definir"})`, detail: `${s.nights} noches · ${doc.profile.travelers} huésped(es)` });
  for (const l of it.legs) tasks.push({ title: `Validar ${modeLabel(l.mode)} ${l.fromName} → ${l.toName}`, detail: l.duration.status === "pending" ? "Conexión estimada por distancia: verificar que exista y sus horarios." : "Verificar horarios y frecuencias con el operador." });
  const booked = it.days.flatMap((d) => d.activities.filter((a) => a.booking === "required").map((a) => a.name));
  if (booked.length) tasks.push({ title: "Revisar entradas y excursiones con reserva obligatoria", detail: booked.join(" · ") });
  if (doc.entryRequirements.length) tasks.push({ title: "Verificar requisitos migratorios", detail: doc.entryRequirements.map((e) => e.country).join(", ") });
  tasks.push({ title: "Confirmar seguro de viaje adecuado" });
  tasks.push({ title: "Calcular el costo total con cotizaciones reales" });
  tasks.push({ title: "Preparar la propuesta comercial" });
  return tasks;
}

/** Componentes a cotizar derivados del itinerario (esquema interno). */
export function quoteComponentsFrom(doc: PlanDocument): { category: QuoteCategory; description: string; dateFrom?: string; dateTo?: string; pax: number; specs?: string; planRef?: string }[] {
  const it = doc.itinerary;
  if (!it) return [];
  const pax = doc.profile.travelers;
  const first = it.stops[0];
  const last = it.stops[it.stops.length - 1];
  const out: ReturnType<typeof quoteComponentsFrom> = [];
  out.push({ category: "flight_out", description: `Vuelo ${it.flights.originAirports[0] ?? doc.profile.originLabel} → ${it.flights.destinationAirports.join("/") || first.name}`, dateFrom: it.startDate, pax, specs: "Clase económica salvo indicación. Verificar equipaje." });
  out.push({ category: "flight_back", description: `Vuelo ${it.flights.returnAirports.join("/") || last.name} → ${it.flights.originAirports[0] ?? doc.profile.originLabel}`, dateFrom: last.departureDate, pax });
  out.push({ category: "transfer", description: `Traslado aeropuerto → hotel en ${first.name}`, dateFrom: first.arrivalDate, pax });
  for (const l of it.legs) {
    const cat: QuoteCategory = l.mode === "plane" ? "flight_internal" : l.mode === "train" ? "train" : l.mode === "bus" ? "bus" : l.mode === "ferry" ? "ferry" : l.mode === "car" ? "car_rental" : "transfer";
    out.push({ category: cat, description: `${l.fromName} → ${l.toName}`, dateFrom: l.date, pax, specs: l.operators.map((o) => o.name).join(", ") || undefined, planRef: l.id });
  }
  for (const s of it.stops) {
    const lod = it.lodging.find((l) => l.stopId === s.id);
    out.push({ category: "lodging", description: `${lod?.category ?? "Alojamiento"} en ${s.name} (${s.lodgingZone ?? "zona a definir"})`, dateFrom: s.arrivalDate, dateTo: s.departureDate, pax, specs: `${s.nights} noches`, planRef: s.id });
  }
  for (const d of it.days) {
    for (const a of d.activities.filter((x) => x.booking === "required")) {
      out.push({ category: a.hours >= 6 ? "excursion" : "tickets", description: a.name, dateFrom: d.date, pax, planRef: a.id });
    }
  }
  out.push({ category: "transfer", description: `Traslado hotel → aeropuerto en ${last.name}`, dateFrom: last.departureDate, pax });
  out.push({ category: "insurance", description: "Seguro de viaje", dateFrom: it.startDate, dateTo: last.departureDate, pax });
  return out;
}

export async function seedProjectWork(projectId: string, versionId: string, doc: PlanDocument) {
  const tasks = suggestedTasks(doc);
  if (tasks.length) {
    await db().insert(schema.tasks).values(tasks.map((t, i) => ({ projectId, title: t.title, detail: t.detail, origin: "suggested", sort: i })));
  }
  const comps = quoteComponentsFrom(doc);
  if (comps.length) {
    await db()
      .insert(schema.quoteComponents)
      .values(comps.map((c, i) => ({ projectId, versionId, category: c.category, description: c.description, dateFrom: c.dateFrom, dateTo: c.dateTo, pax: c.pax, specs: c.specs, planRef: c.planRef, sort: i })));
  }
}

export async function latestVersion(projectId: string) {
  return db().query.planVersions.findFirst({ where: eq(schema.planVersions.projectId, projectId), orderBy: desc(schema.planVersions.number) });
}

export async function getVersion(projectId: string, versionId: string) {
  return db().query.planVersions.findFirst({ where: and(eq(schema.planVersions.projectId, projectId), eq(schema.planVersions.id, versionId)) });
}
