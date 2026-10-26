import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt } from "drizzle-orm";
import { logActivity } from "../activity";
import { db, schema } from "../db";
import { clientIp, hashToken, newToken, rateLimit } from "../security";
import { verifyPassword } from "./password";
import { verifyTotp } from "./totp";

export const ADMIN_COOKIE = "viora_admin";
const SESSION_HOURS = 12;

export type Role = "owner" | "agent" | "viewer";
export interface Staff {
  id: string;
  email: string;
  name: string;
  role: Role;
  totpEnabled: boolean;
}

export async function login(email: string, password: string, totp?: string): Promise<{ ok: true } | { ok: false; error: string; needTotp?: boolean }> {
  const ip = await clientIp();
  if (!(await rateLimit(`login:${ip}`, 20))) return { ok: false, error: "Demasiados intentos. Esperá un rato." };
  const user = await db().query.staffUsers.findFirst({ where: eq(schema.staffUsers.email, email.toLowerCase().trim()) });
  const generic = { ok: false as const, error: "Email o contraseña incorrectos." };
  if (!user || !user.active) {
    await verifyPassword(password, "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAA"); // tiempo constante aproximado
    return generic;
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) return { ok: false, error: "Cuenta bloqueada temporalmente por intentos fallidos." };
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    const attempts = user.failedAttempts + 1;
    await db()
      .update(schema.staffUsers)
      .set({ failedAttempts: attempts, lockedUntil: attempts >= 5 ? new Date(Date.now() + 15 * 60000) : null })
      .where(eq(schema.staffUsers.id, user.id));
    await logActivity("staff.login_failed", { actorKind: "staff", actorId: user.id });
    return generic;
  }
  if (user.totpSecret) {
    if (!totp) return { ok: false, error: "Ingresá el código de tu app de autenticación.", needTotp: true };
    if (!verifyTotp(user.totpSecret, totp)) return { ok: false, error: "Código de verificación incorrecto.", needTotp: true };
  }
  const token = newToken();
  await db()
    .insert(schema.staffSessions)
    .values({ userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + SESSION_HOURS * 3600000) });
  await db().update(schema.staffUsers).set({ failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() }).where(eq(schema.staffUsers.id, user.id));
  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
  await logActivity("staff.login", { actorKind: "staff", actorId: user.id });
  return { ok: true };
}

export async function logout() {
  const c = await cookies();
  const token = c.get(ADMIN_COOKIE)?.value;
  if (token) await db().delete(schema.staffSessions).where(eq(schema.staffSessions.tokenHash, hashToken(token)));
  c.delete(ADMIN_COOKIE);
}

export async function currentStaff(): Promise<Staff | null> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const rows = await db()
    .select({ u: schema.staffUsers })
    .from(schema.staffSessions)
    .innerJoin(schema.staffUsers, eq(schema.staffUsers.id, schema.staffSessions.userId))
    .where(and(eq(schema.staffSessions.tokenHash, hashToken(token)), gt(schema.staffSessions.expiresAt, new Date())))
    .limit(1);
  const u = rows[0]?.u;
  if (!u || !u.active) return null;
  return { id: u.id, email: u.email, name: u.name, role: u.role as Role, totpEnabled: !!u.totpSecret };
}

/** Verificación obligatoria en cada página y acción del panel (no alcanza con ocultar la UI). */
export async function requireStaff(minRole: Role = "viewer"): Promise<Staff> {
  const s = await currentStaff();
  if (!s) redirect("/admin/login");
  const rank: Record<Role, number> = { viewer: 0, agent: 1, owner: 2 };
  if (rank[s.role] < rank[minRole]) throw new Error("No tenés permisos para esta acción.");
  return s;
}
