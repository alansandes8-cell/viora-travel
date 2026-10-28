"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { logActivity } from "@/server/activity";
import { requireStaff } from "@/server/auth/session";
import { db, schema } from "@/server/db";

/** Derecho de supresión: anonimiza los datos de contacto y elimina notas y respuestas libres asociadas. */
export async function anonymizeClient(clientId: string) {
  const staff = await requireStaff("owner");
  const projects = await db().select({ id: schema.tripProjects.id }).from(schema.tripProjects).where(eq(schema.tripProjects.clientId, clientId));
  const ids = projects.map((p) => p.id);
  await db().update(schema.clients).set({ name: null, email: null, phone: null, country: null, anonymizedAt: new Date(), updatedAt: new Date() }).where(eq(schema.clients.id, clientId));
  if (ids.length) {
    await db().update(schema.quoteRequests).set({ name: "Anonimizado", email: null, phone: null, message: null }).where(inArray(schema.quoteRequests.projectId, ids));
    await db().delete(schema.notes).where(inArray(schema.notes.projectId, ids));
  }
  // Las conversaciones con Viorita también contienen datos personales.
  await db().delete(schema.chatConversations).where(eq(schema.chatConversations.clientId, clientId));
  await logActivity("client.anonymized", { actorKind: "staff", actorId: staff.id, details: { clientId, projects: ids.length } });
  revalidatePath("/admin/clientes");
  redirect("/admin/clientes");
}
