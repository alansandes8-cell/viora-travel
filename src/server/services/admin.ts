import "server-only";
import { and, asc, desc, eq, gte, ilike, inArray, isNotNull, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import { refreshDerived } from "@/core/plan";
import type { PlanDocument } from "@/core/types";
import { logActivity } from "../activity";
import type { Staff } from "../auth/session";
import { db, schema } from "../db";
import { planContext } from "../settings";
import { createVersion } from "./projects";

export async function dashboardStats() {
  const d = db();
  const since = new Date(Date.now() - 30 * 86400000);
  const [counts] = await d
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where ${schema.tripProjects.archivedAt} is null)::int`,
      sent: sql<number>`count(*) filter (where ${schema.tripProjects.statusKey} = 'sent')::int`,
      quoting: sql<number>`count(*) filter (where ${schema.tripProjects.statusKey} = 'quoting')::int`,
      confirmed: sql<number>`count(*) filter (where ${schema.tripProjects.statusKey} = 'confirmed')::int`,
      last30: sql<number>`count(*) filter (where ${schema.tripProjects.createdAt} >= ${since})::int`,
    })
    .from(schema.tripProjects)
    .where(eq(schema.tripProjects.isDemo, false));
  const [clients] = await d.select({ n: sql<number>`count(*)::int` }).from(schema.clients).where(gte(schema.clients.createdAt, since));
  const [proposals] = await d.select({ n: sql<number>`count(*)::int` }).from(schema.clientSnapshots);
  const [interested] = await d.select({ n: sql<number>`count(distinct ${schema.quoteRequests.projectId})::int` }).from(schema.quoteRequests);
  const recent = await d
    .select({ a: schema.activityLog, code: schema.tripProjects.code })
    .from(schema.activityLog)
    .leftJoin(schema.tripProjects, eq(schema.tripProjects.id, schema.activityLog.projectId))
    .orderBy(desc(schema.activityLog.createdAt))
    .limit(15);
  const tasks = await d
    .select({ t: schema.tasks, code: schema.tripProjects.code, projectName: schema.tripProjects.name })
    .from(schema.tasks)
    .innerJoin(schema.tripProjects, eq(schema.tripProjects.id, schema.tasks.projectId))
    .where(and(inArray(schema.tasks.status, ["pending", "in_progress"]), isNull(schema.tripProjects.archivedAt)))
    .orderBy(asc(sql`coalesce(${schema.tasks.dueDate}, '2999-01-01')`), asc(schema.tasks.sort))
    .limit(12);
  const followUps = await d
    .select()
    .from(schema.tripProjects)
    .where(and(isNotNull(schema.tripProjects.nextFollowUp), lte(schema.tripProjects.nextFollowUp, new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)), isNull(schema.tripProjects.archivedAt)))
    .orderBy(asc(schema.tripProjects.nextFollowUp))
    .limit(8);
  const newRequests = await d
    .select({ r: schema.quoteRequests, code: schema.tripProjects.code })
    .from(schema.quoteRequests)
    .innerJoin(schema.tripProjects, eq(schema.tripProjects.id, schema.quoteRequests.projectId))
    .orderBy(desc(schema.quoteRequests.createdAt))
    .limit(6);
  const chats = await d
    .select({ c: schema.chatConversations, client: schema.clients })
    .from(schema.chatConversations)
    .leftJoin(schema.clients, eq(schema.clients.id, schema.chatConversations.clientId))
    .orderBy(desc(schema.chatConversations.updatedAt))
    .limit(8);
  return { counts, newClients: clients?.n ?? 0, proposals: proposals?.n ?? 0, interested: interested?.n ?? 0, recent, tasks, followUps, newRequests, chats };
}

export interface ProjectFilters {
  q?: string;
  status?: string;
  priority?: string;
  archived?: boolean;
  demo?: boolean;
  sort?: "updated" | "created" | "followup";
}

export async function listProjects(f: ProjectFilters) {
  const conds: SQL[] = [];
  conds.push(f.archived ? isNotNull(schema.tripProjects.archivedAt) : isNull(schema.tripProjects.archivedAt));
  if (!f.demo) conds.push(eq(schema.tripProjects.isDemo, false));
  if (f.status) conds.push(eq(schema.tripProjects.statusKey, f.status));
  if (f.priority) conds.push(eq(schema.tripProjects.priority, f.priority));
  if (f.q) {
    const q = `%${f.q.replace(/[%_]/g, "")}%`;
    conds.push(
      or(
        ilike(schema.tripProjects.code, q),
        ilike(schema.tripProjects.name, q),
        ilike(schema.tripProjects.destinationSummary, q),
        ilike(schema.clients.name, q),
        ilike(schema.clients.email, q),
      )!,
    );
  }
  const order =
    f.sort === "created"
      ? desc(schema.tripProjects.createdAt)
      : f.sort === "followup"
        ? asc(sql`coalesce(${schema.tripProjects.nextFollowUp}, '2999-01-01')`)
        : desc(schema.tripProjects.updatedAt);
  return db()
    .select({ p: schema.tripProjects, clientName: schema.clients.name, clientEmail: schema.clients.email, status: schema.projectStatuses })
    .from(schema.tripProjects)
    .leftJoin(schema.clients, eq(schema.clients.id, schema.tripProjects.clientId))
    .leftJoin(schema.projectStatuses, eq(schema.projectStatuses.key, schema.tripProjects.statusKey))
    .where(and(...conds))
    .orderBy(order)
    .limit(200);
}

export async function statuses() {
  return db().select().from(schema.projectStatuses).orderBy(asc(schema.projectStatuses.sort));
}

export async function projectBundle(id: string) {
  const d = db();
  const project = await d.query.tripProjects.findFirst({ where: eq(schema.tripProjects.id, id) });
  if (!project) return null;
  const [client, versions, intake, budget, tasks, notes, components, observations, quotes, links, requests, changes, activity] = await Promise.all([
    project.clientId ? d.query.clients.findFirst({ where: eq(schema.clients.id, project.clientId) }) : Promise.resolve(undefined),
    d
      .select({ id: schema.planVersions.id, number: schema.planVersions.number, authorKind: schema.planVersions.authorKind, reason: schema.planVersions.reason, status: schema.planVersions.status, createdAt: schema.planVersions.createdAt, changeSummary: schema.planVersions.changeSummary })
      .from(schema.planVersions)
      .where(eq(schema.planVersions.projectId, id))
      .orderBy(desc(schema.planVersions.number)),
    d.query.intakeSessions.findFirst({ where: eq(schema.intakeSessions.projectId, id) }),
    d.query.budgetHints.findFirst({ where: eq(schema.budgetHints.projectId, id) }),
    d.select().from(schema.tasks).where(eq(schema.tasks.projectId, id)).orderBy(asc(schema.tasks.sort), asc(schema.tasks.createdAt)),
    d.select().from(schema.notes).where(eq(schema.notes.projectId, id)).orderBy(desc(schema.notes.createdAt)),
    d.select().from(schema.quoteComponents).where(eq(schema.quoteComponents.projectId, id)).orderBy(asc(schema.quoteComponents.sort)),
    d.select().from(schema.priceObservations).where(eq(schema.priceObservations.projectId, id)).orderBy(desc(schema.priceObservations.observedAt)),
    d.select().from(schema.quotes).where(eq(schema.quotes.projectId, id)).orderBy(desc(schema.quotes.createdAt)),
    d.select().from(schema.shareLinks).where(eq(schema.shareLinks.projectId, id)).orderBy(desc(schema.shareLinks.createdAt)),
    d.select().from(schema.quoteRequests).where(eq(schema.quoteRequests.projectId, id)).orderBy(desc(schema.quoteRequests.createdAt)),
    d.select().from(schema.changeRequests).where(eq(schema.changeRequests.projectId, id)).orderBy(desc(schema.changeRequests.createdAt)),
    d.select().from(schema.activityLog).where(eq(schema.activityLog.projectId, id)).orderBy(desc(schema.activityLog.createdAt)).limit(100),
  ]);
  const current = project.currentVersionId ? await d.query.planVersions.findFirst({ where: eq(schema.planVersions.id, project.currentVersionId) }) : undefined;
  const quoteLines = quotes.length ? await d.select().from(schema.quoteLines).where(inArray(schema.quoteLines.quoteId, quotes.map((q) => q.id))).orderBy(asc(schema.quoteLines.sort)) : [];
  return { project, client, versions, current, intake, budget, tasks, notes, components, observations, quotes, quoteLines, links, requests, changes, activity };
}

/**
 * Guarda una edición del agente. Si la versión actual es un borrador del agente aún no
 * publicado, se actualiza en el lugar; si no, se crea una nueva versión (las publicadas son inmutables).
 */
export async function saveAgentEdit(projectId: string, staff: Staff, mutate: (doc: PlanDocument) => PlanDocument | void, summary: string) {
  const project = await db().query.tripProjects.findFirst({ where: eq(schema.tripProjects.id, projectId) });
  if (!project?.currentVersionId) throw new Error("Proyecto sin versión");
  const current = await db().query.planVersions.findFirst({ where: eq(schema.planVersions.id, project.currentVersionId) });
  if (!current) throw new Error("Versión inexistente");
  const doc = structuredClone(current.document);
  const result = mutate(doc) ?? doc;
  refreshDerived(result, await planContext());
  const editable = current.authorKind === "agent" && current.status === "draft" && project.publishedVersionId !== current.id;
  if (editable) {
    await db()
      .update(schema.planVersions)
      .set({ document: result, changeSummary: [...current.changeSummary, summary] })
      .where(eq(schema.planVersions.id, current.id));
    await db().update(schema.tripProjects).set({ updatedAt: new Date() }).where(eq(schema.tripProjects.id, projectId));
  } else {
    await createVersion({ projectId, doc: result, authorKind: "agent", authorUserId: staff.id, reason: "Edición del agente", summary: [summary], parentId: current.id });
  }
  await logActivity("plan.edited", { projectId, actorKind: "staff", actorId: staff.id, details: { summary } });
}
