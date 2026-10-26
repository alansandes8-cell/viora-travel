"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { applyChanges, parseChangeRequest, type ChangeOp } from "@/core/changes";
import { newId } from "@/core/itinerary";
import { generatePlan, selectAlternative } from "@/core/plan";
import { computeQuote, QUOTE_CATEGORIES, QUOTE_CATEGORY_LABELS, type QuoteCategory } from "@/core/pricing";
import { scanForMoney } from "@/core/sanitize";
import { VERIFICATION_STATUSES, type IntakeAnswers, type PlanDocument, type VerificationStatus } from "@/core/types";
import { logActivity } from "@/server/activity";
import { aiConfigured, criticReview, enhanceNarratives, research } from "@/server/ai/claude";
import { requireStaff } from "@/server/auth/session";
import { db, schema } from "@/server/db";
import { saveAgentEdit } from "@/server/services/admin";
import { createShareLink, createVersion, publishClientSnapshot, suggestedTasks, summarize } from "@/server/services/projects";
import { agency, planContext } from "@/server/settings";

const uuid = z.string().uuid();
const str = (fd: FormData, k: string, max = 2000) => String(fd.get(k) ?? "").trim().slice(0, max);
const optStr = (fd: FormData, k: string, max = 2000) => str(fd, k, max) || undefined;
const safeUrl = (v?: string) => (v && /^https?:\/\/[^\s]+$/i.test(v) ? v : undefined);

function refresh(projectId: string) {
  revalidatePath(`/admin/proyectos/${projectId}`);
}

async function guard(projectId: string) {
  uuid.parse(projectId);
  const staff = await requireStaff("agent");
  const project = await db().query.tripProjects.findFirst({ where: eq(schema.tripProjects.id, projectId) });
  if (!project) throw new Error("Proyecto inexistente");
  return { staff, project };
}

async function answersOf(projectId: string): Promise<IntakeAnswers> {
  const intake = await db().query.intakeSessions.findFirst({ where: eq(schema.intakeSessions.projectId, projectId) });
  return (intake?.answers ?? {}) as IntakeAnswers;
}

// ───────────────────────── Proyecto ─────────────────────────

export async function updateProjectMeta(projectId: string, fd: FormData) {
  const { staff, project } = await guard(projectId);
  const statusKey = str(fd, "statusKey", 40) || project.statusKey;
  const st = await db().query.projectStatuses.findFirst({ where: eq(schema.projectStatuses.key, statusKey) });
  const priority = ["high", "normal", "low"].includes(str(fd, "priority")) ? str(fd, "priority") : project.priority;
  const follow = str(fd, "nextFollowUp", 10);
  await db()
    .update(schema.tripProjects)
    .set({
      name: str(fd, "name", 140) || project.name,
      statusKey: st ? statusKey : project.statusKey,
      priority,
      nextTask: optStr(fd, "nextTask", 200) ?? null,
      nextFollowUp: /^\d{4}-\d{2}-\d{2}$/.test(follow) ? follow : null,
      updatedAt: new Date(),
    })
    .where(eq(schema.tripProjects.id, projectId));
  await logActivity("project.updated", { projectId, actorKind: "staff", actorId: staff.id, details: { statusKey, priority } });
  refresh(projectId);
}

export async function toggleArchive(projectId: string) {
  const { staff, project } = await guard(projectId);
  await db().update(schema.tripProjects).set({ archivedAt: project.archivedAt ? null : new Date() }).where(eq(schema.tripProjects.id, projectId));
  await logActivity("project.updated", { projectId, actorKind: "staff", actorId: staff.id, details: { archived: !project.archivedAt } });
  refresh(projectId);
}

export async function updateClient(projectId: string, fd: FormData) {
  const { staff, project } = await guard(projectId);
  const values = { name: optStr(fd, "name", 120) ?? null, email: optStr(fd, "email", 200) ?? null, phone: optStr(fd, "phone", 40) ?? null, country: optStr(fd, "country", 80) ?? null, updatedAt: new Date() };
  if (project.clientId) await db().update(schema.clients).set(values).where(eq(schema.clients.id, project.clientId));
  else {
    const [c] = await db().insert(schema.clients).values({ ...values, source: "agent" }).returning();
    await db().update(schema.tripProjects).set({ clientId: c.id }).where(eq(schema.tripProjects.id, projectId));
  }
  await logActivity("project.updated", { projectId, actorKind: "staff", actorId: staff.id, details: { client: "updated" } });
  refresh(projectId);
}

// ───────────────────────── Edición del plan ─────────────────────────

async function editWithOps(projectId: string, ops: ChangeOp[], summary: string) {
  const { staff } = await guard(projectId);
  const ctx = await planContext();
  const answers = await answersOf(projectId);
  await saveAgentEdit(projectId, staff, (doc) => applyChanges(doc, ops, answers, ctx), summary);
  refresh(projectId);
}

export async function setStopNights(projectId: string, stopId: string, fd: FormData) {
  const n = Number(fd.get("nights"));
  if (!Number.isInteger(n) || n < 1 || n > 60) throw new Error("Noches inválidas");
  await editWithOps(projectId, [{ op: "set_nights", stopId, nights: n }], `Noches de una parada fijadas en ${n} (bloqueada)`);
}

export async function removeStop(projectId: string, stopId: string) {
  await editWithOps(projectId, [{ op: "remove_stop", stopId }], "Parada eliminada por el agente");
}

export async function addStop(projectId: string, fd: FormData) {
  const destinationId = str(fd, "destinationId", 60);
  const ctx = await planContext();
  if (!ctx.library.some((d) => d.id === destinationId)) throw new Error("Destino inválido");
  await editWithOps(projectId, [{ op: "add_stop", destinationId }], `Destino agregado: ${destinationId}`);
}

export async function replaceStop(projectId: string, stopId: string, fd: FormData) {
  const destinationId = str(fd, "destinationId", 60);
  await editWithOps(projectId, [{ op: "replace_stop", stopId, destinationId }], `Parada reemplazada por ${destinationId}`);
}

export async function moveStop(projectId: string, stopId: string, dir: number) {
  const { staff } = await guard(projectId);
  const ctx = await planContext();
  const answers = await answersOf(projectId);
  await saveAgentEdit(
    projectId,
    staff,
    (doc) => {
      const ids = doc.itinerary?.stops.map((s) => s.id) ?? [];
      const i = ids.indexOf(stopId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= ids.length) return doc;
      [ids[i], ids[j]] = [ids[j], ids[i]];
      return applyChanges(doc, [{ op: "reorder", stopIds: ids }], answers, ctx);
    },
    "Orden de la ruta modificado",
  );
  refresh(projectId);
}

function findDay(doc: PlanDocument, dayId: string) {
  const d = doc.itinerary?.days.find((x) => x.id === dayId);
  if (!d) throw new Error("Día inexistente");
  return d;
}

export async function editActivity(projectId: string, dayId: string, actId: string, fd: FormData) {
  const { staff } = await guard(projectId);
  await saveAgentEdit(
    projectId,
    staff,
    (doc) => {
      const day = findDay(doc, dayId);
      const a = day.activities.find((x) => x.id === actId);
      if (!a) return;
      a.name = str(fd, "name", 160) || a.name;
      a.why = str(fd, "why", 400) || a.why;
      const h = Number(fd.get("hours"));
      if (h > 0 && h <= 14) a.hours = h;
      a.url = safeUrl(optStr(fd, "url", 400)) ?? a.url;
      const booking = str(fd, "booking");
      if (["required", "recommended", "no"].includes(booking)) a.booking = booking as typeof a.booking;
      a.origin = "agent";
      a.locked = true;
    },
    `Actividad editada (día ${dayId.slice(-4)})`,
  );
  refresh(projectId);
}

export async function removeActivity(projectId: string, dayId: string, actId: string) {
  const { staff } = await guard(projectId);
  await saveAgentEdit(
    projectId,
    staff,
    (doc) => {
      const day = findDay(doc, dayId);
      day.activities = day.activities.filter((x) => x.id !== actId);
      day.locked = true;
      day.origin = "agent";
    },
    "Actividad eliminada",
  );
  refresh(projectId);
}

export async function addActivity(projectId: string, dayId: string, fd: FormData) {
  const { staff } = await guard(projectId);
  const name = str(fd, "name", 160);
  if (name.length < 2) throw new Error("Nombre requerido");
  await saveAgentEdit(
    projectId,
    staff,
    (doc) => {
      const day = findDay(doc, dayId);
      const stop = doc.itinerary!.stops.find((s) => s.id === day.stopId);
      const h = Number(fd.get("hours"));
      day.activities.push({
        id: newId("act"),
        origin: "agent",
        locked: true,
        name,
        why: str(fd, "why", 400) || "Agregada por tu asesor.",
        hours: h > 0 && h <= 14 ? h : 2,
        where: stop?.name ?? "",
        booking: (["required", "recommended", "no"].includes(str(fd, "booking")) ? str(fd, "booking") : "no") as "required" | "recommended" | "no",
        effort: 1,
        url: safeUrl(optStr(fd, "url", 400)),
      });
      day.locked = true;
    },
    `Actividad agregada: ${name}`,
  );
  refresh(projectId);
}

export async function editDay(projectId: string, dayId: string, fd: FormData) {
  const { staff } = await guard(projectId);
  await saveAgentEdit(
    projectId,
    staff,
    (doc) => {
      const day = findDay(doc, dayId);
      day.title = str(fd, "title", 160) || day.title;
      day.freeTime = str(fd, "freeTime", 500) || day.freeTime;
      day.food = optStr(fd, "food", 300) ?? day.food;
      day.rainPlan = optStr(fd, "rainPlan", 300) ?? day.rainPlan;
      day.logistics = optStr(fd, "logistics", 400) ?? day.logistics;
      day.locked = true;
      day.origin = "agent";
    },
    `Día editado`,
  );
  refresh(projectId);
}

export async function toggleLock(projectId: string, kind: "stop" | "day", id: string) {
  const { staff } = await guard(projectId);
  await saveAgentEdit(
    projectId,
    staff,
    (doc) => {
      const it = doc.itinerary;
      if (!it) return;
      const item = kind === "stop" ? it.stops.find((s) => s.id === id) : it.days.find((d) => d.id === id);
      if (item) item.locked = !item.locked;
    },
    `Bloqueo modificado (${kind})`,
  );
  refresh(projectId);
}

export async function editLodging(projectId: string, stopId: string, fd: FormData) {
  const { staff } = await guard(projectId);
  await saveAgentEdit(
    projectId,
    staff,
    (doc) => {
      const l = doc.itinerary?.lodging.find((x) => x.stopId === stopId);
      if (!l) return;
      l.category = str(fd, "category", 120) || l.category;
      l.zone = str(fd, "zone", 120) || l.zone;
      l.zoneProfile = str(fd, "zoneProfile", 200) || l.zoneProfile;
      l.why = str(fd, "why", 400) || l.why;
      l.locked = true;
      l.origin = "agent";
      const stop = doc.itinerary!.stops.find((s) => s.id === stopId);
      if (stop) stop.lodgingZone = l.zone;
    },
    "Alojamiento editado",
  );
  refresh(projectId);
}

export async function addLodgingOption(projectId: string, stopId: string, fd: FormData) {
  const { staff } = await guard(projectId);
  const name = str(fd, "name", 140);
  if (name.length < 2) throw new Error("Nombre requerido");
  const extra = { name, location: str(fd, "location", 160), pros: str(fd, "pros", 300), cons: str(fd, "cons", 300) };
  if (scanForMoney(extra).length) throw new Error("No incluyas precios en las opciones de alojamiento: cargalos en Cotizar.");
  await saveAgentEdit(
    projectId,
    staff,
    (doc) => {
      const l = doc.itinerary?.lodging.find((x) => x.stopId === stopId);
      if (!l) return;
      l.options.push({
        id: newId("opt"),
        name,
        location: extra.location || undefined,
        url: safeUrl(optStr(fd, "url", 400)),
        source: optStr(fd, "source", 200),
        pros: extra.pros || undefined,
        cons: extra.cons || undefined,
        toConfirm: ["Disponibilidad para las fechas", "Capacidad de la habitación", "Condiciones de cancelación"],
        origin: "agent",
      });
      l.locked = true;
    },
    `Opción de alojamiento agregada: ${name}`,
  );
  refresh(projectId);
}

export async function removeLodgingOption(projectId: string, stopId: string, optionId: string) {
  const { staff } = await guard(projectId);
  await saveAgentEdit(
    projectId,
    staff,
    (doc) => {
      const l = doc.itinerary?.lodging.find((x) => x.stopId === stopId);
      if (l) l.options = l.options.filter((o) => o.id !== optionId);
    },
    "Opción de alojamiento eliminada",
  );
  refresh(projectId);
}

export async function editTexts(projectId: string, fd: FormData) {
  const { staff } = await guard(projectId);
  const title = str(fd, "title", 140);
  const concept = str(fd, "concept", 600);
  if (scanForMoney({ title, concept }).length) throw new Error("Los textos para el cliente no pueden incluir importes.");
  await saveAgentEdit(
    projectId,
    staff,
    (doc) => {
      if (title) doc.title = title;
      if (concept) doc.concept = concept;
    },
    "Título y concepto editados",
  );
  refresh(projectId);
}

export async function editAlternative(projectId: string, altId: string, fd: FormData) {
  const { staff } = await guard(projectId);
  const fields = { summary: str(fd, "summary", 800), mainReason: str(fd, "mainReason", 600), idealTraveler: str(fd, "idealTraveler", 300) };
  const pros = str(fd, "pros", 1500).split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 8);
  const cons = str(fd, "cons", 1500).split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 8);
  if (scanForMoney({ fields, pros, cons }).length) throw new Error("Los textos para el cliente no pueden incluir importes.");
  await saveAgentEdit(
    projectId,
    staff,
    (doc) => {
      const a = doc.alternatives.find((x) => x.id === altId);
      if (!a) return;
      if (fields.summary) a.summary = fields.summary;
      if (fields.mainReason) a.mainReason = fields.mainReason;
      if (fields.idealTraveler) a.idealTraveler = fields.idealTraveler;
      if (pros.length) a.pros = pros;
      if (cons.length) a.cons = cons;
    },
    "Textos de alternativa editados",
  );
  refresh(projectId);
}

export async function verifyLeg(projectId: string, legId: string, fd: FormData) {
  const { staff } = await guard(projectId);
  const status = str(fd, "status") as VerificationStatus;
  if (!(VERIFICATION_STATUSES as readonly string[]).includes(status)) throw new Error("Estado inválido");
  const url = safeUrl(optStr(fd, "sourceUrl", 400));
  if (status === "verified_current" && !url) throw new Error("Para marcar como verificado, indicá la fuente consultada.");
  await saveAgentEdit(
    projectId,
    staff,
    (doc) => {
      const l = doc.itinerary?.legs.find((x) => x.id === legId);
      if (!l) return;
      const h = Number(fd.get("hours"));
      l.duration = {
        value: h > 0 && h < 72 ? h : l.duration.value,
        status,
        sources: url ? [{ label: str(fd, "sourceLabel", 120) || url, url, checkedAt: new Date().toISOString() }] : l.duration.sources,
        checkedAt: new Date().toISOString(),
        note: optStr(fd, "note", 300) ?? l.duration.note,
      };
      const mode = str(fd, "mode");
      if (["plane", "train", "bus", "car", "private_transfer", "public_transport", "ferry"].includes(mode)) l.mode = mode as typeof l.mode;
      l.locked = true;
      l.origin = "agent";
    },
    `Traslado actualizado (${status})`,
  );
  refresh(projectId);
}

export async function selectAlternativeAgent(projectId: string, altId: string) {
  const { staff } = await guard(projectId);
  const ctx = await planContext();
  const answers = await answersOf(projectId);
  await saveAgentEdit(projectId, staff, (doc) => selectAlternative(doc, altId, answers, ctx), "Alternativa seleccionada por el agente");
  refresh(projectId);
}

export async function applyAgentChange(projectId: string, fd: FormData) {
  const { staff } = await guard(projectId);
  const text = str(fd, "text", 600);
  const ctx = await planContext();
  const answers = await answersOf(projectId);
  const project = await db().query.tripProjects.findFirst({ where: eq(schema.tripProjects.id, projectId) });
  const current = await db().query.planVersions.findFirst({ where: eq(schema.planVersions.id, project!.currentVersionId!) });
  const parsed = parseChangeRequest(text, current!.document, ctx.library);
  if (parsed.unmatched || parsed.conflicts.length) {
    await db().insert(schema.notes).values({ projectId, authorId: staff.id, kind: "note", text: `Pedido de cambio no aplicado automáticamente: «${text}». ${parsed.conflicts.join(" ")}` });
    refresh(projectId);
    return;
  }
  if (parsed.ops.some((o) => o.op === "recompute_alternatives")) {
    await regenerate(projectId, "cheaper");
    return;
  }
  await saveAgentEdit(projectId, staff, (doc) => applyChanges(doc, parsed.ops, answers, ctx), `Cambio: «${text}» — ${parsed.explanation.join(" ")}`);
  refresh(projectId);
}

export async function regenerate(projectId: string, focus?: string) {
  const { staff } = await guard(projectId);
  const answers = await answersOf(projectId);
  const ctx = await planContext();
  if (focus === "cheaper") ctx.baseWeights = { ...(ctx.baseWeights ?? {}), budget: ((ctx.baseWeights?.budget ?? 1.5) as number) * 3 } as typeof ctx.baseWeights;
  const doc = generatePlan(answers, ctx);
  await createVersion({ projectId, doc, authorKind: "engine", authorUserId: staff.id, reason: focus === "cheaper" ? "Alternativas recalculadas priorizando presupuesto" : "Propuesta regenerada desde el cuestionario (las ediciones manuales quedan en versiones anteriores)" });
  await db().update(schema.tripProjects).set({ ...summarize(doc, answers) }).where(eq(schema.tripProjects.id, projectId));
  await logActivity("plan.edited", { projectId, actorKind: "staff", actorId: staff.id, details: { regenerate: focus ?? "full" } });
  refresh(projectId);
}

// ───────────────────────── Versiones y publicación ─────────────────────────

export async function publishCurrent(projectId: string) {
  const { staff, project } = await guard(projectId);
  if (!project.currentVersionId) throw new Error("Sin versión");
  await db().update(schema.planVersions).set({ status: "approved" }).where(eq(schema.planVersions.id, project.currentVersionId));
  await publishClientSnapshot(projectId, project.currentVersionId, "reviewed");
  if (["new", "planning", "research"].includes(project.statusKey)) await db().update(schema.tripProjects).set({ statusKey: "proposal_ready" }).where(eq(schema.tripProjects.id, projectId));
  await logActivity("plan.published", { projectId, actorKind: "staff", actorId: staff.id, details: { versionId: project.currentVersionId } });
  refresh(projectId);
}

export async function restoreVersion(projectId: string, versionId: string) {
  const { staff } = await guard(projectId);
  const v = await db().query.planVersions.findFirst({ where: and(eq(schema.planVersions.id, versionId), eq(schema.planVersions.projectId, projectId)) });
  if (!v) throw new Error("Versión inexistente");
  await createVersion({ projectId, doc: v.document, authorKind: "agent", authorUserId: staff.id, reason: `Restaurada desde la versión ${v.number}`, parentId: v.id });
  await logActivity("plan.restored", { projectId, actorKind: "staff", actorId: staff.id, details: { from: v.number } });
  refresh(projectId);
}

// ───────────────────────── Compartir ─────────────────────────

export async function createAgentShareLink(projectId: string, fd: FormData) {
  const { staff } = await guard(projectId);
  const snap = await db().query.clientSnapshots.findFirst({
    where: and(eq(schema.clientSnapshots.projectId, projectId), eq(schema.clientSnapshots.kind, "client_proposal")),
    orderBy: desc(schema.clientSnapshots.createdAt),
  });
  if (!snap) throw new Error("No hay una propuesta publicada para compartir.");
  const days = Math.min(365, Math.max(1, Number(fd.get("days")) || 30));
  const { token } = await createShareLink(projectId, snap.id, "client_proposal", `staff:${staff.id}`, days);
  await db().insert(schema.notes).values({ projectId, authorId: staff.id, kind: "note", text: `Enlace para el cliente creado (vence en ${days} días): ${agency.appUrl()}/p/${token}` });
  await db().update(schema.tripProjects).set({ statusKey: "sent", updatedAt: new Date() }).where(eq(schema.tripProjects.id, projectId));
  refresh(projectId);
}

export async function revokeLink(projectId: string, linkId: string) {
  const { staff } = await guard(projectId);
  await db().update(schema.shareLinks).set({ revokedAt: new Date() }).where(and(eq(schema.shareLinks.id, linkId), eq(schema.shareLinks.projectId, projectId)));
  await logActivity("share_link.revoked", { projectId, actorKind: "staff", actorId: staff.id, details: { linkId } });
  refresh(projectId);
}

export async function resolveChangeRequest(projectId: string, requestId: string, status: "applied" | "rejected") {
  await guard(projectId);
  await db().update(schema.changeRequests).set({ status }).where(and(eq(schema.changeRequests.id, requestId), eq(schema.changeRequests.projectId, projectId)));
  refresh(projectId);
}

// ───────────────────────── Tareas y notas ─────────────────────────

export async function addTask(projectId: string, fd: FormData) {
  await guard(projectId);
  const title = str(fd, "title", 200);
  if (title.length < 2) throw new Error("Título requerido");
  const due = str(fd, "dueDate", 10);
  await db().insert(schema.tasks).values({ projectId, title, detail: optStr(fd, "detail", 600), dueDate: /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : null, origin: "manual", sort: 999 });
  refresh(projectId);
}

export async function setTaskStatus(projectId: string, taskId: string, fd: FormData) {
  await guard(projectId);
  const status = str(fd, "status");
  if (!["pending", "in_progress", "verified", "done"].includes(status)) throw new Error("Estado inválido");
  await db().update(schema.tasks).set({ status, updatedAt: new Date() }).where(and(eq(schema.tasks.id, taskId), eq(schema.tasks.projectId, projectId)));
  refresh(projectId);
}

export async function deleteTask(projectId: string, taskId: string) {
  await guard(projectId);
  await db().delete(schema.tasks).where(and(eq(schema.tasks.id, taskId), eq(schema.tasks.projectId, projectId)));
  refresh(projectId);
}

export async function addSuggestedTasks(projectId: string) {
  const { project } = await guard(projectId);
  const v = await db().query.planVersions.findFirst({ where: eq(schema.planVersions.id, project.currentVersionId!) });
  const existing = new Set((await db().select({ t: schema.tasks.title }).from(schema.tasks).where(eq(schema.tasks.projectId, projectId))).map((r) => r.t));
  const fresh = suggestedTasks(v!.document).filter((t) => !existing.has(t.title));
  if (fresh.length) await db().insert(schema.tasks).values(fresh.map((t, i) => ({ projectId, title: t.title, detail: t.detail, origin: "suggested", sort: 500 + i })));
  refresh(projectId);
}

export async function addNote(projectId: string, fd: FormData) {
  const { staff } = await guard(projectId);
  const text = str(fd, "text", 4000);
  const kind = ["note", "decision", "comment"].includes(str(fd, "kind")) ? str(fd, "kind") : "note";
  if (text.length < 2) throw new Error("Texto requerido");
  await db().insert(schema.notes).values({ projectId, authorId: staff.id, kind, text });
  refresh(projectId);
}

// ───────────────────────── Componentes, observaciones y presupuesto ─────────────────────────

const isCat = (c: string): c is QuoteCategory => (QUOTE_CATEGORIES as readonly string[]).includes(c);
const dec = (v: string) => (/^\d+([.,]\d{1,6})?$/.test(v) ? v.replace(",", ".") : null);
const isoDate = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

export async function addComponent(projectId: string, fd: FormData) {
  await guard(projectId);
  const category = str(fd, "category");
  if (!isCat(category)) throw new Error("Categoría inválida");
  await db().insert(schema.quoteComponents).values({
    projectId,
    category,
    description: str(fd, "description", 300) || QUOTE_CATEGORY_LABELS[category],
    dateFrom: isoDate(str(fd, "dateFrom")),
    dateTo: isoDate(str(fd, "dateTo")),
    pax: Number(fd.get("pax")) || null,
    specs: optStr(fd, "specs", 500),
    supplier: optStr(fd, "supplier", 200),
    sourceUrl: safeUrl(optStr(fd, "sourceUrl", 400)),
    sort: 999,
  });
  refresh(projectId);
}

export async function setComponentVerification(projectId: string, componentId: string, fd: FormData) {
  await guard(projectId);
  const v = str(fd, "verification");
  if (!["pending", "in_progress", "verified", "done", "unavailable"].includes(v)) throw new Error("Estado inválido");
  await db()
    .update(schema.quoteComponents)
    .set({ verification: v, supplier: optStr(fd, "supplier", 200), sourceUrl: safeUrl(optStr(fd, "sourceUrl", 400)) })
    .where(and(eq(schema.quoteComponents.id, componentId), eq(schema.quoteComponents.projectId, projectId)));
  refresh(projectId);
}

export async function deleteComponent(projectId: string, componentId: string) {
  await guard(projectId);
  await db().delete(schema.quoteComponents).where(and(eq(schema.quoteComponents.id, componentId), eq(schema.quoteComponents.projectId, projectId)));
  refresh(projectId);
}

export async function addObservation(projectId: string, fd: FormData) {
  const { staff } = await guard(projectId);
  const kind = str(fd, "kind");
  if (!["consulted_real", "observed_on_date", "reference_estimate", "historical", "unavailable"].includes(kind)) throw new Error("Tipo inválido");
  const amount = kind === "unavailable" ? null : dec(str(fd, "amount"));
  if (kind !== "unavailable" && !amount) throw new Error("Importe inválido");
  const observedAt = str(fd, "observedAt", 16);
  await db().insert(schema.priceObservations).values({
    projectId,
    componentId: uuid.safeParse(str(fd, "componentId")).success ? str(fd, "componentId") : null,
    kind,
    provider: optStr(fd, "provider", 200),
    observedAt: observedAt ? new Date(observedAt) : new Date(),
    travelFrom: isoDate(str(fd, "travelFrom")),
    travelTo: isoDate(str(fd, "travelTo")),
    pax: Number(fd.get("pax")) || null,
    currency: optStr(fd, "currency", 3)?.toUpperCase(),
    amount,
    includes: optStr(fd, "includes", 500),
    excludes: optStr(fd, "excludes", 500),
    baggage: optStr(fd, "baggage", 300),
    cancellation: optStr(fd, "cancellation", 300),
    url: safeUrl(optStr(fd, "url", 400)),
    availability: optStr(fd, "availability", 100),
    validUntil: str(fd, "validUntil") ? new Date(str(fd, "validUntil")) : null,
    notes: optStr(fd, "notes", 500),
    createdBy: staff.id,
  });
  refresh(projectId);
}

export async function createQuote(projectId: string, fd: FormData) {
  const { staff, project } = await guard(projectId);
  const currency = (str(fd, "currency", 3) || "USD").toUpperCase();
  const [q] = await db()
    .insert(schema.quotes)
    .values({ projectId, versionId: project.currentVersionId, currency, travelers: Math.max(1, Number(fd.get("travelers")) || project.travelers || 1) })
    .returning();
  await logActivity("quote.updated", { projectId, actorKind: "staff", actorId: staff.id, details: { quoteId: q.id, created: true } });
  refresh(projectId);
}

export async function updateQuote(projectId: string, quoteId: string, fd: FormData) {
  const { staff } = await guard(projectId);
  const taxes: { label: string; mode: "percent" | "fixed"; value: string }[] = [];
  for (let i = 0; i < 5; i++) {
    const label = str(fd, `taxLabel${i}`, 80);
    const value = dec(str(fd, `taxValue${i}`));
    if (label && value) taxes.push({ label, mode: str(fd, `taxMode${i}`) === "fixed" ? "fixed" : "percent", value });
  }
  const margin = str(fd, "marginPercent");
  const fee = str(fd, "managementFee");
  await db()
    .update(schema.quotes)
    .set({
      currency: (str(fd, "currency", 3) || "USD").toUpperCase(),
      travelers: Math.max(1, Number(fd.get("travelers")) || 1),
      taxes,
      marginPercent: margin ? dec(margin) : null,
      managementFee: fee ? dec(fee) : null,
      fxNote: optStr(fd, "fxNote", 200) ?? null,
      fxDate: isoDate(str(fd, "fxDate")),
      paymentTerms: optStr(fd, "paymentTerms", 1000) ?? null,
      validUntil: isoDate(str(fd, "validUntil")),
      included: optStr(fd, "included", 2000) ?? null,
      excluded: optStr(fd, "excluded", 2000) ?? null,
      conditions: optStr(fd, "conditions", 3000) ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(schema.quotes.id, quoteId), eq(schema.quotes.projectId, projectId)));
  await logActivity("quote.updated", { projectId, actorKind: "staff", actorId: staff.id, details: { quoteId } });
  refresh(projectId);
}

export async function addQuoteLine(projectId: string, quoteId: string, fd: FormData) {
  await guard(projectId);
  const q = await db().query.quotes.findFirst({ where: and(eq(schema.quotes.id, quoteId), eq(schema.quotes.projectId, projectId)) });
  if (!q) throw new Error("Presupuesto inexistente");
  const category = str(fd, "category");
  if (!isCat(category)) throw new Error("Categoría inválida");
  const unit = dec(str(fd, "unitAmount"));
  if (!unit) throw new Error("Importe inválido");
  const currency = (str(fd, "currency", 3) || q.currency).toUpperCase();
  const fx = str(fd, "fxRate");
  await db().insert(schema.quoteLines).values({
    quoteId,
    category,
    description: str(fd, "description", 300) || QUOTE_CATEGORY_LABELS[category],
    quantity: dec(str(fd, "quantity")) ?? "1",
    unitAmount: unit,
    currency,
    fxRate: fx ? dec(fx) : null,
    perPerson: fd.get("perPerson") === "on",
    componentId: uuid.safeParse(str(fd, "componentId")).success ? str(fd, "componentId") : null,
    sort: 999,
  });
  refresh(projectId);
}

export async function deleteQuoteLine(projectId: string, lineId: string) {
  await guard(projectId);
  const line = await db().query.quoteLines.findFirst({ where: eq(schema.quoteLines.id, lineId) });
  if (!line) return;
  const q = await db().query.quotes.findFirst({ where: eq(schema.quotes.id, line.quoteId) });
  if (q?.projectId !== projectId) throw new Error("No autorizado");
  await db().delete(schema.quoteLines).where(eq(schema.quoteLines.id, lineId));
  refresh(projectId);
}

/** Propuesta comercial presupuestada: documento independiente, solo desde un presupuesto aprobado. */
export async function publishPricedProposal(projectId: string, quoteId: string) {
  const { staff, project } = await guard(projectId);
  const q = await db().query.quotes.findFirst({ where: and(eq(schema.quotes.id, quoteId), eq(schema.quotes.projectId, projectId)) });
  if (!q) throw new Error("Presupuesto inexistente");
  const lines = await db().select().from(schema.quoteLines).where(eq(schema.quoteLines.quoteId, quoteId));
  const result = computeQuote({
    currency: q.currency,
    travelers: q.travelers,
    lines: lines.map((l) => ({ id: l.id, category: l.category as QuoteCategory, description: l.description, quantity: l.quantity, unitAmount: l.unitAmount, currency: l.currency, fxRate: l.fxRate ?? undefined, perPerson: l.perPerson })),
    taxes: q.taxes,
    marginPercent: q.marginPercent ?? undefined,
    managementFee: q.managementFee ?? undefined,
  });
  if (!result.ok) throw new Error(`Revisá el presupuesto: ${result.errors.join(" ")}`);
  if (!q.validUntil) throw new Error("Indicá la vigencia de la propuesta antes de publicarla.");
  const version = project.currentVersionId ? await db().query.planVersions.findFirst({ where: eq(schema.planVersions.id, project.currentVersionId) }) : null;
  const doc = version?.document;
  const content = {
    kind: "priced_proposal",
    title: doc?.title ?? project.name,
    route: doc?.itinerary?.stops.map((s) => ({ name: s.name, nights: s.nights })) ?? [],
    startDate: doc?.itinerary?.startDate ?? null,
    travelers: q.travelers,
    services: [...new Set(lines.map((l) => `${QUOTE_CATEGORY_LABELS[l.category as QuoteCategory]}: ${l.description}`))],
    included: q.included,
    excluded: q.excluded,
    conditions: q.conditions,
    paymentTerms: q.paymentTerms,
    validUntil: q.validUntil,
    currency: q.currency,
    total: result.finalPrice,
    perPerson: result.perPerson,
    issuedAt: new Date().toISOString(),
  };
  await db().update(schema.quotes).set({ status: "approved", updatedAt: new Date() }).where(eq(schema.quotes.id, quoteId));
  const [snap] = await db()
    .insert(schema.clientSnapshots)
    .values({ projectId, versionId: project.currentVersionId ?? quoteId, kind: "priced_proposal", content, contentHash: `${quoteId}:${Date.now()}` })
    .returning();
  const validDays = Math.max(1, Math.ceil((Date.parse(q.validUntil) - Date.now()) / 86400000) + 1);
  const { token } = await createShareLink(projectId, snap.id, "priced_proposal", `staff:${staff.id}`, validDays);
  await db().insert(schema.notes).values({ projectId, authorId: staff.id, kind: "decision", text: `Propuesta comercial publicada (vigente hasta ${q.validUntil}): ${agency.appUrl()}/p/${token}` });
  await db().update(schema.tripProjects).set({ statusKey: "quoting", updatedAt: new Date() }).where(eq(schema.tripProjects.id, projectId));
  await logActivity("quote.priced_published", { projectId, actorKind: "staff", actorId: staff.id, details: { quoteId } });
  refresh(projectId);
}

// ───────────────────────── IA (opcional) ─────────────────────────

export async function runCriticReview(projectId: string) {
  const { staff, project } = await guard(projectId);
  if (!aiConfigured()) throw new Error("La IA no está configurada (ANTHROPIC_API_KEY).");
  const v = await db().query.planVersions.findFirst({ where: eq(schema.planVersions.id, project.currentVersionId!) });
  const out = await criticReview(v!.document, projectId);
  const text = out ? (out.issues.length ? out.issues.map((i) => `[${i.severity}] ${i.message}`).join("\n") : "Sin observaciones adicionales.") : "La revisión con IA no pudo completarse.";
  await db().insert(schema.notes).values({ projectId, authorId: staff.id, kind: "comment", text: `Revisión crítica (IA, ${new Date().toLocaleDateString("es-AR")}):\n${text}` });
  await logActivity("ai.review", { projectId, actorKind: "staff", actorId: staff.id });
  refresh(projectId);
}

export async function runResearch(projectId: string, fd: FormData) {
  const { staff, project } = await guard(projectId);
  if (!aiConfigured()) throw new Error("La IA no está configurada (ANTHROPIC_API_KEY).");
  const topic = str(fd, "topic", 300);
  if (topic.length < 5) throw new Error("Indicá qué investigar.");
  const out = await research(topic, `${project.name} · ${project.destinationSummary ?? ""} · ${project.tentativeDates ?? ""}`, projectId);
  const text = out
    ? `Investigación (IA con búsqueda web, consultado el ${new Date().toLocaleString("es-AR")}): ${topic}\n\n${out.text}\n\nFuentes:\n${out.sources.map((s) => `- ${s.title}: ${s.url}`).join("\n") || "- (sin fuentes citadas: no usar como dato verificado)"}`
    : `La investigación sobre «${topic}» no pudo completarse.`;
  await db().insert(schema.notes).values({ projectId, authorId: staff.id, kind: "comment", text });
  await logActivity("ai.research", { projectId, actorKind: "staff", actorId: staff.id, details: { topic } });
  refresh(projectId);
}

export async function runEnhanceTexts(projectId: string) {
  const { staff, project } = await guard(projectId);
  if (!aiConfigured()) throw new Error("La IA no está configurada (ANTHROPIC_API_KEY).");
  const v = await db().query.planVersions.findFirst({ where: eq(schema.planVersions.id, project.currentVersionId!) });
  const answers = await answersOf(projectId);
  const improved = await enhanceNarratives(v!.document, answers.dreamText, projectId);
  if (improved.engine.kind === "rules+ai") {
    await createVersion({ projectId, doc: improved, authorKind: "ai", authorUserId: staff.id, reason: "Textos mejorados con IA (a pedido del agente)", parentId: v!.id });
  }
  refresh(projectId);
}
