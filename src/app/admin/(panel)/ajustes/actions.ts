"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, lt } from "drizzle-orm";
import { BASE_WEIGHTS } from "@/core/catalog";
import { CRITERIA } from "@/core/types";
import { logActivity } from "@/server/activity";
import { hashPassword, passwordProblems } from "@/server/auth/password";
import { requireStaff } from "@/server/auth/session";
import { newTotpSecret, verifyTotp } from "@/server/auth/totp";
import { db, schema } from "@/server/db";
import { clearOldRateLimits } from "@/server/security";
import { setSetting } from "@/server/settings";

export async function saveWeights(fd: FormData) {
  const staff = await requireStaff("owner");
  const w: Record<string, number> = {};
  for (const c of CRITERIA) {
    const v = Number(fd.get(c));
    w[c] = v >= 0 && v <= 10 ? v : BASE_WEIGHTS[c];
  }
  await setSetting("scoring_weights", w);
  await logActivity("settings.weights", { actorKind: "staff", actorId: staff.id, details: w });
  revalidatePath("/admin/ajustes");
}

export async function saveGeneral(fd: FormData) {
  await requireStaff("owner");
  const num = (k: string, min: number, max: number, def: number) => {
    const v = Number(fd.get(k));
    return Number.isFinite(v) && v >= min && v <= max ? v : def;
  };
  await setSetting("share_link_days", num("share_link_days", 1, 365, 90));
  await setSetting("draft_retention_days", num("draft_retention_days", 7, 730, 90));
  await setSetting("ai_daily_limit", num("ai_daily_limit", 0, 10000, 200));
  await setSetting("generations_per_ip_per_hour", num("generations_per_ip_per_hour", 1, 500, 15));
  revalidatePath("/admin/ajustes");
}

export async function renameStatus(key: string, fd: FormData) {
  await requireStaff("owner");
  const label = String(fd.get("label") ?? "").trim().slice(0, 60);
  if (label.length < 2) return;
  await db().update(schema.projectStatuses).set({ label }).where(eq(schema.projectStatuses.key, key));
  revalidatePath("/admin/ajustes");
}

export async function createUser(fd: FormData) {
  const staff = await requireStaff("owner");
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const name = String(fd.get("name") ?? "").trim().slice(0, 100);
  const role = String(fd.get("role") ?? "agent");
  const password = String(fd.get("password") ?? "");
  if (!email.includes("@") || name.length < 2 || !["owner", "agent", "viewer"].includes(role)) throw new Error("Datos inválidos");
  const problems = passwordProblems(password);
  if (problems.length) throw new Error(problems.join(" "));
  await db().insert(schema.staffUsers).values({ email, name, role, passwordHash: await hashPassword(password) }).onConflictDoNothing();
  await logActivity("staff.created", { actorKind: "staff", actorId: staff.id, details: { email, role } });
  revalidatePath("/admin/ajustes");
}

export async function toggleUser(userId: string) {
  const staff = await requireStaff("owner");
  if (userId === staff.id) throw new Error("No podés desactivarte a vos mismo.");
  const u = await db().query.staffUsers.findFirst({ where: eq(schema.staffUsers.id, userId) });
  if (!u) return;
  await db().update(schema.staffUsers).set({ active: !u.active }).where(eq(schema.staffUsers.id, userId));
  if (u.active) await db().delete(schema.staffSessions).where(eq(schema.staffSessions.userId, userId));
  revalidatePath("/admin/ajustes");
}

export async function startTotp() {
  const staff = await requireStaff();
  const secret = newTotpSecret();
  await setSetting(`pending_totp:${staff.id}`, secret);
  revalidatePath("/admin/ajustes");
}

export async function confirmTotp(fd: FormData) {
  const staff = await requireStaff();
  const row = await db().query.settings.findFirst({ where: eq(schema.settings.key, `pending_totp:${staff.id}`) });
  const secret = row?.value as string | undefined;
  if (!secret || !verifyTotp(secret, String(fd.get("code") ?? ""))) throw new Error("Código incorrecto. Probá de nuevo.");
  await db().update(schema.staffUsers).set({ totpSecret: secret }).where(eq(schema.staffUsers.id, staff.id));
  await db().delete(schema.settings).where(eq(schema.settings.key, `pending_totp:${staff.id}`));
  await logActivity("staff.totp_enabled", { actorKind: "staff", actorId: staff.id });
  revalidatePath("/admin/ajustes");
}

/** Política de retención: borra borradores vencidos sin proyecto y registros técnicos antiguos. */
export async function purgeExpired() {
  const staff = await requireStaff("owner");
  const deleted = await db()
    .delete(schema.intakeSessions)
    .where(and(isNull(schema.intakeSessions.projectId), lt(schema.intakeSessions.expiresAt, new Date())))
    .returning({ id: schema.intakeSessions.id });
  await db().delete(schema.staffSessions).where(lt(schema.staffSessions.expiresAt, new Date()));
  await clearOldRateLimits();
  await logActivity("retention.purge", { actorKind: "staff", actorId: staff.id, details: { drafts: deleted.length } });
  revalidatePath("/admin/ajustes");
}
