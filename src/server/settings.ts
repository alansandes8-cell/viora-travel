import { DEFAULT_DAILY_SPEND, type DailySpendTable } from "@/core/daily-spend";
import { DEFAULT_TRIP_ESTIMATE, type TripEstimateTable } from "@/core/trip-estimate";
import "server-only";
import { eq } from "drizzle-orm";
import { BASE_WEIGHTS } from "@/core/catalog";
import { KNOWN_CONNECTIONS, SEED_DESTINATIONS } from "@/core/library";
import type { PlanContext } from "@/core/plan";
import type { Criterion, Destination } from "@/core/types";
import { db, schema } from "./db";

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db().query.settings.findFirst({ where: eq(schema.settings.key, key) });
  return (row?.value as T) ?? fallback;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db()
    .insert(schema.settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: new Date() } });
}

let cache: { at: number; library: Destination[] } | null = null;

/** Biblioteca vigente (tabla `destinations`), con respaldo en la semilla si la tabla está vacía. */
export async function loadLibrary(): Promise<Destination[]> {
  if (cache && Date.now() - cache.at < 60_000) return cache.library;
  const rows = await db().select().from(schema.destinations).where(eq(schema.destinations.active, true));
  const library = rows.length ? rows.map((r) => r.data as Destination) : SEED_DESTINATIONS;
  cache = { at: Date.now(), library };
  return library;
}

export function invalidateLibrary() {
  cache = null;
}

export async function planContext(): Promise<PlanContext> {
  return {
    library: await loadLibrary(),
    connections: KNOWN_CONNECTIONS,
    baseWeights: await getSetting<Record<Criterion, number>>("scoring_weights", BASE_WEIGHTS),
    dailySpend: await getSetting<DailySpendTable>("daily_spend", DEFAULT_DAILY_SPEND),
    tripEstimate: await getSetting<TripEstimateTable>("trip_estimate", DEFAULT_TRIP_ESTIMATE),
  };
}

export const agency = {
  name: "VIORA TRAVEL",
  whatsapp: () => process.env.AGENCY_WHATSAPP ?? "",
  email: () => process.env.AGENCY_EMAIL ?? "",
  appUrl: () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
};
