import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, isNull } from "drizzle-orm";
import { logActivity } from "../activity";
import { db, schema } from "../db";
import { sendEmail, emailConfigured } from "../integrations/notify";
import { clientIp, hashToken, newToken, rateLimit } from "../security";
import { agency } from "../settings";
import { hashPassword, verifyPassword } from "./password";

/**
 * Acceso de clientes a «Mi viaje». Separado del panel: otra cookie, otra tabla de sesiones
 * y nunca da acceso a nada del equipo. Las contraseñas se guardan con scrypt.
 */
export const CLIENT_COOKIE = "viora_cliente";
const SESSION_DAYS = 60;
const DUMMY_HASH = "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAA";

export function clientPasswordProblems(pw: string): string[] {
  const out: string[] = [];
  if (pw.length < 8) out.push("Usá al menos 8 caracteres.");
  if (!/[a-zA-Z]/.test(pw) || !/\d/.test(pw)) out.push("Combiná letras y números.");
  if (pw.length > 200) out.push("Es demasiado larga.");
  return out;
}

async function startSession(accountId: string) {
  const token = newToken();
  await db()
    .insert(schema.clientSessions)
    .values({ accountId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + SESSION_DAYS * 86400000) });
  await db().update(schema.clientAccounts).set({ failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() }).where(eq(schema.clientAccounts.id, accountId));
  (await cookies()).set(CLIENT_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_DAYS * 86400 });
}

export async function clientLogin(emailRaw: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await rateLimit(`client-login:${await clientIp()}`, 20))) return { ok: false, error: "Demasiados intentos. Esperá un rato y probá de nuevo." };
  const email = String(emailRaw ?? "").toLowerCase().trim().slice(0, 120);
  const acc = await db().query.clientAccounts.findFirst({ where: eq(schema.clientAccounts.email, email) });
  const generic = { ok: false as const, error: "Email o contraseña incorrectos." };
  if (!acc || !acc.active || !acc.passwordHash) {
    await verifyPassword(String(password ?? ""), DUMMY_HASH);
    return generic;
  }
  if (acc.lockedUntil && acc.lockedUntil > new Date()) return { ok: false, error: "Por seguridad bloqueamos el acceso unos minutos. Probá más tarde." };
  if (!(await verifyPassword(String(password ?? ""), acc.passwordHash))) {
    const n = acc.failedAttempts + 1;
    await db()
      .update(schema.clientAccounts)
      .set({ failedAttempts: n, lockedUntil: n >= 6 ? new Date(Date.now() + 15 * 60000) : null })
      .where(eq(schema.clientAccounts.id, acc.id));
    return generic;
  }
  await startSession(acc.id);
  await logActivity("client.login", { actorKind: "client", actorId: acc.clientId });
  return { ok: true };
}

export async function clientLogout() {
  const c = await cookies();
  const token = c.get(CLIENT_COOKIE)?.value;
  if (token) await db().delete(schema.clientSessions).where(eq(schema.clientSessions.tokenHash, hashToken(token)));
  c.delete(CLIENT_COOKIE);
}

export interface ClientAccount {
  id: string;
  clientId: string;
  email: string;
  name: string;
}

export async function currentClientAccount(): Promise<ClientAccount | null> {
  const token = (await cookies()).get(CLIENT_COOKIE)?.value;
  if (!token) return null;
  const rows = await db()
    .select({ a: schema.clientAccounts, c: schema.clients })
    .from(schema.clientSessions)
    .innerJoin(schema.clientAccounts, eq(schema.clientAccounts.id, schema.clientSessions.accountId))
    .innerJoin(schema.clients, eq(schema.clients.id, schema.clientAccounts.clientId))
    .where(and(eq(schema.clientSessions.tokenHash, hashToken(token)), gt(schema.clientSessions.expiresAt, new Date())))
    .limit(1);
  const r = rows[0];
  if (!r || !r.a.active) return null;
  return { id: r.a.id, clientId: r.a.clientId, email: r.a.email, name: r.c.name ?? "" };
}

export async function requireClient(): Promise<ClientAccount> {
  const a = await currentClientAccount();
  if (!a) redirect("/acceder");
  return a;
}

// ───────────── Alta, activación y recuperación ─────────────

async function issueToken(accountId: string, purpose: "activate" | "reset", hours: number): Promise<string> {
  const token = newToken();
  await db().insert(schema.clientAccountTokens).values({ accountId, tokenHash: hashToken(token), purpose, expiresAt: new Date(Date.now() + hours * 3600000) });
  return token;
}

/**
 * La agencia crea (o renueva) el acceso del cliente y obtiene un enlace para que elija su contraseña.
 * El enlace vale 14 días y sirve una sola vez. Nunca se genera ni se envía una contraseña.
 */
export async function createClientAccess(clientId: string, emailRaw: string): Promise<{ ok: true; link: string; emailed: boolean } | { ok: false; error: string }> {
  const email = String(emailRaw ?? "").toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) return { ok: false, error: "Revisá el email del cliente." };
  const other = await db().query.clientAccounts.findFirst({ where: eq(schema.clientAccounts.email, email) });
  if (other && other.clientId !== clientId) return { ok: false, error: "Ese email ya tiene acceso con otro cliente." };
  let acc = await db().query.clientAccounts.findFirst({ where: eq(schema.clientAccounts.clientId, clientId) });
  if (acc) {
    await db().update(schema.clientAccounts).set({ email, active: true, failedAttempts: 0, lockedUntil: null }).where(eq(schema.clientAccounts.id, acc.id));
  } else {
    [acc] = await db().insert(schema.clientAccounts).values({ clientId, email }).returning();
  }
  const purpose = acc.passwordHash ? "reset" : "activate";
  const link = `${agency.appUrl()}/acceder/clave/${await issueToken(acc.id, purpose, 24 * 14)}`;
  let emailed = false;
  if (emailConfigured()) {
    const r = await sendEmail(
      email,
      "Tu acceso a «Mi viaje» — VIORA TRAVEL",
      `¡Hola! Ya podés ver tu viaje, tus vouchers y el plan día por día en VIORA TRAVEL.\n\nElegí tu contraseña acá (el enlace vale 14 días):\n${link}\n\nDespués entrás siempre desde ${agency.appUrl()}/acceder con tu email.`,
    ).catch(() => ({ status: "failed" as const }));
    emailed = r.status === "sent";
  }
  return { ok: true, link, emailed };
}

export async function tokenInfo(token: string): Promise<{ email: string; purpose: string } | null> {
  if (!/^[\w-]{20,100}$/.test(token)) return null;
  const rows = await db()
    .select({ t: schema.clientAccountTokens, a: schema.clientAccounts })
    .from(schema.clientAccountTokens)
    .innerJoin(schema.clientAccounts, eq(schema.clientAccounts.id, schema.clientAccountTokens.accountId))
    .where(and(eq(schema.clientAccountTokens.tokenHash, hashToken(token)), isNull(schema.clientAccountTokens.usedAt), gt(schema.clientAccountTokens.expiresAt, new Date())))
    .limit(1);
  return rows[0] ? { email: rows[0].a.email, purpose: rows[0].t.purpose } : null;
}

/** Elige la contraseña con un enlace válido (activación o recuperación) y deja la sesión iniciada. */
export async function setPasswordWithToken(token: string, password: string, confirm: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await rateLimit(`client-setpw:${await clientIp()}`, 20))) return { ok: false, error: "Demasiados intentos. Esperá un rato." };
  if (password !== confirm) return { ok: false, error: "Las contraseñas no coinciden." };
  const problems = clientPasswordProblems(password);
  if (problems.length) return { ok: false, error: problems.join(" ") };
  if (!/^[\w-]{20,100}$/.test(token)) return { ok: false, error: "El enlace no es válido." };
  const t = await db().query.clientAccountTokens.findFirst({
    where: and(eq(schema.clientAccountTokens.tokenHash, hashToken(token)), isNull(schema.clientAccountTokens.usedAt), gt(schema.clientAccountTokens.expiresAt, new Date())),
  });
  if (!t) return { ok: false, error: "El enlace venció o ya se usó. Pedile uno nuevo a tu asesor." };
  await db().update(schema.clientAccountTokens).set({ usedAt: new Date() }).where(eq(schema.clientAccountTokens.id, t.id));
  await db().update(schema.clientAccounts).set({ passwordHash: await hashPassword(password), active: true }).where(eq(schema.clientAccounts.id, t.accountId));
  // Al cambiar la contraseña se cierran las otras sesiones.
  await db().delete(schema.clientSessions).where(eq(schema.clientSessions.accountId, t.accountId));
  await startSession(t.accountId);
  return { ok: true };
}

/** «Olvidé mi contraseña»: siempre responde lo mismo (no revela si el email existe). */
export async function requestPasswordReset(emailRaw: string): Promise<{ ok: true; emailEnabled: boolean }> {
  const emailEnabled = emailConfigured();
  if (!(await rateLimit(`client-reset:${await clientIp()}`, 5))) return { ok: true, emailEnabled };
  const email = String(emailRaw ?? "").toLowerCase().trim().slice(0, 120);
  const acc = await db().query.clientAccounts.findFirst({ where: eq(schema.clientAccounts.email, email) });
  if (acc?.active && emailEnabled) {
    const link = `${agency.appUrl()}/acceder/clave/${await issueToken(acc.id, "reset", 2)}`;
    await sendEmail(email, "Recuperá tu contraseña — VIORA TRAVEL", `Para elegir una nueva contraseña entrá acá (vale 2 horas):\n${link}\n\nSi no lo pediste, ignorá este mensaje.`).catch(() => {});
  }
  return { ok: true, emailEnabled };
}
