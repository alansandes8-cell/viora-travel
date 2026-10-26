import "server-only";
import { cookies } from "next/headers";
import { after } from "next/server";
import { desc, eq } from "drizzle-orm";
import { applyChanges, parseChangeRequest, type ChangeOp } from "@/core/changes";
import { budgetAmountSchema, contactSchema, intakeSchema } from "@/core/intake-schema";
import { generatePlan, selectAlternative } from "@/core/plan";
import { pickSmartQuestions, type SmartQuestion } from "@/core/questions";
import { buildProfile } from "@/core/profile";
import type { ClientProposal } from "@/core/sanitize";
import type { IntakeAnswers } from "@/core/types";
import { logActivity } from "../activity";
import { aiConfigured, enhanceNarratives, parseChangeWithAi } from "../ai/claude";
import { db, publicDb, schema } from "../db";
import { sendEmail } from "../integrations/notify";
import { clientIp, hashToken, newToken, rateLimit } from "../security";
import { agency, getSetting, loadLibrary, planContext } from "../settings";
import { createShareLink, createVersion, nextProjectCode, publishClientSnapshot, seedProjectWork, summarize } from "./projects";

export const TRIP_COOKIE = "viora_trip";

async function cookieToken(): Promise<string | null> {
  return (await cookies()).get(TRIP_COOKIE)?.value ?? null;
}

async function setTripCookie(token: string) {
  (await cookies()).set(TRIP_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
}

async function currentIntake() {
  const token = await cookieToken();
  if (!token) return null;
  const row = await db().query.intakeSessions.findFirst({ where: eq(schema.intakeSessions.tokenHash, hashToken(token)) });
  if (!row || row.expiresAt < new Date()) return null;
  return row;
}

/** Devuelve las respuestas guardadas para retomar el cuestionario (sin importes). */
export async function loadDraft(): Promise<{ answers: Partial<IntakeAnswers>; step: number; hasProposal: boolean } | null> {
  const row = await currentIntake();
  if (!row) return null;
  return { answers: row.answers, step: row.step, hasProposal: !!row.projectId };
}

/** Autoguardado del cuestionario. Valida tamaño y forma; no requiere que esté completo. */
export async function saveDraft(answers: Partial<IntakeAnswers>, step: number): Promise<{ ok: boolean }> {
  const json = JSON.stringify(answers ?? {});
  if (json.length > 20_000) return { ok: false };
  const days = await getSetting<number>("draft_retention_days", 90);
  let row = await currentIntake();
  if (!row) {
    if (!(await rateLimit(`draft:${await clientIp()}`, 60))) return { ok: false };
    const token = newToken();
    [row] = await db()
      .insert(schema.intakeSessions)
      .values({ tokenHash: hashToken(token), answers, step, expiresAt: new Date(Date.now() + days * 86400000) })
      .returning();
    await setTripCookie(token);
    return { ok: true };
  }
  if (row.projectId && row.status === "submitted") {
    // Ya existe una propuesta: los cambios al cuestionario se guardan como borrador nuevo de las respuestas.
  }
  await db()
    .update(schema.intakeSessions)
    .set({ answers, step: Math.max(0, Math.min(20, step)), updatedAt: new Date() })
    .where(eq(schema.intakeSessions.id, row.id));
  return { ok: true };
}

/** Preguntas inteligentes del paso 9, calculadas en el servidor a partir de las respuestas. */
export async function smartQuestionsFor(raw: unknown): Promise<SmartQuestion[]> {
  const parsed = intakeSchema.safeParse(raw);
  if (!parsed.success) return [];
  const library = await loadLibrary();
  const profile = buildProfile(parsed.data as IntakeAnswers, library);
  return pickSmartQuestions(profile, parsed.data as IntakeAnswers);
}

export type SubmitResult = { ok: true } | { ok: false; error: string; fields?: Record<string, string> };

/** Envía el cuestionario: genera el plan, crea el proyecto y publica la propuesta preliminar. */
export async function submitIntake(raw: unknown, rawBudget: unknown): Promise<SubmitResult> {
  const parsed = intakeSchema.safeParse(raw);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const i of parsed.error.issues) fields[i.path.join(".")] = i.message;
    return { ok: false, error: "Revisá los datos marcados.", fields };
  }
  const budget = budgetAmountSchema.safeParse(rawBudget);
  const ip = await clientIp();
  const perHour = await getSetting<number>("generations_per_ip_per_hour", 15);
  if (!(await rateLimit(`gen:${ip}`, perHour))) return { ok: false, error: "Hiciste muchas consultas seguidas. Probá de nuevo en un rato." };

  const answers = parsed.data as IntakeAnswers;
  await saveDraft(answers, 9);
  const intake = await currentIntake();
  if (!intake) return { ok: false, error: "No pudimos guardar tus respuestas. Revisá que tu navegador acepte cookies." };

  const ctx = await planContext();
  const doc = generatePlan(answers, ctx);
  const summary = summarize(doc, answers);

  let projectId = intake.projectId;
  if (!projectId) {
    for (let attempt = 0; attempt < 3 && !projectId; attempt++) {
      try {
        const [p] = await db()
          .insert(schema.tripProjects)
          .values({ code: await nextProjectCode(), name: doc.title, statusKey: "new", ...summary })
          .returning();
        projectId = p.id;
      } catch {
        /* código duplicado por concurrencia: reintentar */
      }
    }
    if (!projectId) return { ok: false, error: "No pudimos crear tu proyecto. Intentá nuevamente." };
  } else {
    await db().update(schema.tripProjects).set({ ...summary, updatedAt: new Date() }).where(eq(schema.tripProjects.id, projectId));
  }
  await db().update(schema.intakeSessions).set({ projectId, status: "submitted", updatedAt: new Date() }).where(eq(schema.intakeSessions.id, intake.id));
  if (budget.success && budget.data) {
    await db()
      .insert(schema.budgetHints)
      .values({ projectId, amount: String(budget.data.amount), currency: budget.data.currency, per: budget.data.per, includes: answers.budget.includes ?? {}, flexibility: answers.budget.flexibility })
      .onConflictDoUpdate({
        target: schema.budgetHints.projectId,
        set: { amount: String(budget.data.amount), currency: budget.data.currency, per: budget.data.per, includes: answers.budget.includes ?? {}, flexibility: answers.budget.flexibility, updatedAt: new Date() },
      });
  }
  const isFirst = !intake.projectId;
  const version = await createVersion({ projectId, doc, authorKind: "engine", reason: isFirst ? "Propuesta inicial generada desde el cuestionario" : "Cuestionario actualizado por el cliente" });
  await publishClientSnapshot(projectId, version.id, "preliminary");
  if (isFirst) await seedProjectWork(projectId, version.id, doc);
  await logActivity(isFirst ? "proposal.generated" : "proposal.regenerated", { projectId, actorKind: "client", details: { alternatives: doc.alternatives.map((a) => a.title) } });

  // Mejora de textos con IA en segundo plano (si está configurada). No bloquea al cliente.
  if (aiConfigured()) {
    const pid = projectId;
    after(async () => {
      const improved = await enhanceNarratives(doc, answers.dreamText, pid);
      if (improved.engine.kind !== "rules+ai") return;
      const latest = await db().query.tripProjects.findFirst({ where: eq(schema.tripProjects.id, pid) });
      if (latest?.publishedVersionId !== version.id) return; // hubo cambios mientras tanto: no pisar
      const v2 = await createVersion({ projectId: pid, doc: improved, authorKind: "ai", reason: "Textos personalizados por IA", parentId: version.id });
      await publishClientSnapshot(pid, v2.id, "preliminary");
    });
  }
  return { ok: true };
}

/** Propuesta visible para el cliente actual (instantánea saneada leída con el rol público). */
export async function currentProposal(): Promise<{ proposal: ClientProposal; snapshotId: string } | null> {
  const token = await cookieToken();
  if (!token) return null;
  const pdb = publicDb();
  const intake = await pdb.query.intakeSessions.findFirst({
    columns: { projectId: true, expiresAt: true },
    where: eq(schema.intakeSessions.tokenHash, hashToken(token)),
  });
  if (!intake?.projectId || intake.expiresAt < new Date()) return null;
  const snap = await pdb.query.clientSnapshots.findFirst({
    where: eq(schema.clientSnapshots.projectId, intake.projectId),
    orderBy: desc(schema.clientSnapshots.createdAt),
  });
  if (!snap) return null;
  return { proposal: snap.content as ClientProposal, snapshotId: snap.id };
}

async function requireProject() {
  const intake = await currentIntake();
  if (!intake?.projectId) return null;
  const project = await db().query.tripProjects.findFirst({ where: eq(schema.tripProjects.id, intake.projectId) });
  if (!project?.publishedVersionId) return null;
  const version = await db().query.planVersions.findFirst({ where: eq(schema.planVersions.id, project.publishedVersionId) });
  if (!version) return null;
  return { intake, project, version, answers: intake.answers as IntakeAnswers };
}

export async function chooseAlternative(alternativeId: string): Promise<{ ok: boolean; error?: string }> {
  const ctxp = await requireProject();
  if (!ctxp) return { ok: false, error: "No encontramos tu propuesta." };
  const doc = structuredClone(ctxp.version.document);
  if (!doc.alternatives.some((a) => a.id === alternativeId)) return { ok: false, error: "Alternativa inválida." };
  if (doc.selectedAlternativeId === alternativeId) return { ok: true };
  selectAlternative(doc, alternativeId, ctxp.answers, await planContext());
  const alt = doc.alternatives.find((a) => a.id === alternativeId)!;
  const v = await createVersion({ projectId: ctxp.project.id, doc, authorKind: "client", reason: `El cliente eligió: ${alt.title}`, parentId: ctxp.version.id });
  await publishClientSnapshot(ctxp.project.id, v.id, ctxp.version.status === "approved" ? "reviewed" : "preliminary");
  await db().update(schema.tripProjects).set({ ...summarize(doc, ctxp.answers) }).where(eq(schema.tripProjects.id, ctxp.project.id));
  await logActivity("client.alternative_selected", { projectId: ctxp.project.id, actorKind: "client", details: { alternative: alt.title } });
  return { ok: true };
}

export async function requestChange(text: string): Promise<{ ok: boolean; message: string; explanation?: string[] }> {
  const clean = text.trim().slice(0, 600);
  if (clean.length < 4) return { ok: false, message: "Contanos qué te gustaría cambiar." };
  if (!(await rateLimit(`change:${await clientIp()}`, 30))) return { ok: false, message: "Hiciste muchos cambios seguidos. Probá en un rato." };
  const ctxp = await requireProject();
  if (!ctxp) return { ok: false, message: "No encontramos tu propuesta." };
  const ctx = await planContext();
  const doc = ctxp.version.document;
  let parsed = parseChangeRequest(clean, doc, ctx.library);
  let ops: ChangeOp[] = parsed.ops;
  let explanation = parsed.explanation;
  if (parsed.unmatched && aiConfigured()) {
    const ai = await parseChangeWithAi(clean, doc, ctx.library, ctxp.project.id);
    if (ai) {
      ops = ai.ops;
      explanation = ai.explanation;
      parsed = { ...parsed, unmatched: false };
    }
  }
  if (parsed.conflicts.length || parsed.unmatched || ops.some((o) => o.op === "recompute_alternatives")) {
    await db().insert(schema.changeRequests).values({ projectId: ctxp.project.id, source: "client", text: clean, parsed: { ops, conflicts: parsed.conflicts }, status: parsed.unmatched ? "unmatched" : "pending_approval" });
    await db().insert(schema.notes).values({ projectId: ctxp.project.id, kind: "client_change", text: `Pedido de cambio del cliente: «${clean}»` });
    await logActivity("client.change_requested", { projectId: ctxp.project.id, actorKind: "client", details: { text: clean, status: "pending" } });
    return {
      ok: true,
      message: "Registramos tu pedido. Como requiere una revisión más amplia, un asesor de VIORA lo va a analizar y actualizar tu propuesta.",
    };
  }
  const next = applyChanges(doc, ops, ctxp.answers, ctx);
  const v = await createVersion({ projectId: ctxp.project.id, doc: next, authorKind: "client", reason: `Cambio pedido por el cliente: «${clean}»`, summary: explanation, parentId: ctxp.version.id });
  await publishClientSnapshot(ctxp.project.id, v.id, "preliminary");
  await db().insert(schema.changeRequests).values({ projectId: ctxp.project.id, source: "client", text: clean, parsed: { ops }, status: "applied", resultVersionId: v.id });
  await logActivity("client.change_applied", { projectId: ctxp.project.id, actorKind: "client", details: { text: clean } });
  return { ok: true, message: "Listo, actualizamos tu itinerario.", explanation };
}

export async function shareProposal(): Promise<{ ok: boolean; url?: string; error?: string }> {
  const ctxp = await requireProject();
  if (!ctxp) return { ok: false, error: "No encontramos tu propuesta." };
  if (!(await rateLimit(`share:${await clientIp()}`, 20))) return { ok: false, error: "Probá de nuevo en un rato." };
  const snap = await db().query.clientSnapshots.findFirst({ where: eq(schema.clientSnapshots.projectId, ctxp.project.id), orderBy: desc(schema.clientSnapshots.createdAt) });
  if (!snap) return { ok: false, error: "No hay propuesta para compartir." };
  const { token } = await createShareLink(ctxp.project.id, snap.id, "client_proposal", "client");
  return { ok: true, url: `${agency.appUrl()}/p/${token}` };
}

/** Enlace para continuar en otro dispositivo (equivale a la sesión: es privado). */
export async function resumeLink(): Promise<string | null> {
  const token = await cookieToken();
  if (!token || !(await currentIntake())) return null;
  return `${agency.appUrl()}/continuar/${token}`;
}

export async function resumeFromToken(token: string): Promise<boolean> {
  if (!token || token.length > 100) return false;
  const row = await db().query.intakeSessions.findFirst({ where: eq(schema.intakeSessions.tokenHash, hashToken(token)) });
  if (!row || row.expiresAt < new Date()) return false;
  await setTripCookie(token);
  return true;
}

export async function requestQuote(raw: unknown): Promise<{ ok: boolean; error?: string; fields?: Record<string, string>; notified?: "sent" | "not_configured" | "failed" }> {
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const i of parsed.error.issues) fields[i.path.join(".") || "form"] = i.message;
    return { ok: false, error: "Revisá los datos.", fields };
  }
  if (!(await rateLimit(`quote:${await clientIp()}`, 10))) return { ok: false, error: "Probá de nuevo en un rato." };
  const ctxp = await requireProject();
  if (!ctxp) return { ok: false, error: "No encontramos tu propuesta." };
  const c = parsed.data;
  let clientId = ctxp.project.clientId;
  if (!clientId) {
    const [cl] = await db()
      .insert(schema.clients)
      .values({ name: c.name, email: c.email, phone: c.phone, consentContact: true, consentAt: new Date(), source: "web" })
      .returning();
    clientId = cl.id;
  } else {
    await db().update(schema.clients).set({ name: c.name, email: c.email, phone: c.phone, consentContact: true, consentAt: new Date(), updatedAt: new Date() }).where(eq(schema.clients.id, clientId));
  }
  const project = ctxp.project;
  const mail = agency.email()
    ? await sendEmail(
        agency.email(),
        `Nueva solicitud de cotización ${project.code}`,
        `Proyecto: ${project.code} — ${project.name}\nCliente: ${c.name}\nEmail: ${c.email ?? "-"}\nTeléfono: ${c.phone ?? "-"}\nCanal preferido: ${c.preferredChannel}\nMensaje: ${c.message ?? "-"}\n\nVer en el panel: ${agency.appUrl()}/admin/proyectos/${project.id}`,
      )
    : { status: "not_configured" as const };
  await db().insert(schema.quoteRequests).values({
    projectId: project.id,
    clientId,
    name: c.name,
    email: c.email,
    phone: c.phone,
    preferredChannel: c.preferredChannel,
    message: c.message,
    consent: true,
    notificationStatus: mail.status,
    notificationError: "error" in mail ? mail.error : undefined,
  });
  await db().update(schema.tripProjects).set({ clientId, statusKey: project.statusKey === "new" ? "planning" : project.statusKey, priority: "high", updatedAt: new Date() }).where(eq(schema.tripProjects.id, project.id));
  await logActivity("client.quote_requested", { projectId: project.id, actorKind: "client", details: { channel: c.preferredChannel, notification: mail.status } });
  return { ok: true, notified: mail.status };
}
