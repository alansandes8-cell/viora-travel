import "server-only";
import { db, schema } from "./db";

export async function logActivity(
  action: string,
  opts: { projectId?: string | null; actorKind: "staff" | "client" | "system"; actorId?: string | null; details?: Record<string, unknown> },
): Promise<void> {
  try {
    await db().insert(schema.activityLog).values({
      action,
      projectId: opts.projectId ?? null,
      actorKind: opts.actorKind,
      actorId: opts.actorId ?? null,
      details: opts.details ?? {},
    });
  } catch (e) {
    console.error("[viora] no se pudo registrar actividad", (e as Error).message);
  }
}
