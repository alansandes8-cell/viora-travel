import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { sql } from "drizzle-orm";
import { db, schema } from "./db";

export function newToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET debe tener al menos 32 caracteres.");
    return "dev-only-secret-change-me-0123456789abcdef";
  }
  return s;
}

/** Firma corta para URLs internas temporales (p. ej., impresión a PDF). */
export function signPayload(payload: string, ttlSeconds = 300): { exp: number; sig: string } {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = createHmac("sha256", secret()).update(`${payload}.${exp}`).digest("base64url");
  return { exp, sig };
}

export function verifySignature(payload: string, exp: number, sig: string): boolean {
  if (!exp || exp < Math.floor(Date.now() / 1000)) return false;
  const expected = createHmac("sha256", secret()).update(`${payload}.${exp}`).digest("base64url");
  const a = Buffer.from(expected);
  const b = Buffer.from(sig ?? "");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "local").trim();
}

/** Límite de tasa simple basado en Postgres (ventanas de una hora). */
export async function rateLimit(key: string, max: number): Promise<boolean> {
  const window = new Date();
  window.setMinutes(0, 0, 0);
  const rows = await db()
    .insert(schema.rateLimits)
    .values({ key, windowStart: window, count: 1 })
    .onConflictDoUpdate({ target: [schema.rateLimits.key, schema.rateLimits.windowStart], set: { count: sql`${schema.rateLimits.count} + 1` } })
    .returning({ count: schema.rateLimits.count });
  return (rows[0]?.count ?? 0) <= max;
}

export async function clearOldRateLimits(): Promise<void> {
  await db().delete(schema.rateLimits).where(sql`${schema.rateLimits.windowStart} < now() - interval '2 days'`);
}
