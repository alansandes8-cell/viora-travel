"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/server/activity";
import { createClientAccess } from "@/server/auth/client-session";
import { requireStaff } from "@/server/auth/session";
import { autoPlan, createTrip, deleteFile, deleteItem, deleteTrip, parseItemForm, parseTripForm, planInput, saveItem, savePlan, updateTrip } from "@/server/services/my-trip";

type State = { error?: string; ok?: boolean } | null;

export async function createTripAction(clientId: string, _prev: State, fd: FormData): Promise<State> {
  const staff = await requireStaff("agent");
  const p = parseTripForm(fd);
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Revisá los datos." };
  const id = await createTrip(clientId, p.data);
  await autoPlan(id);
  await logActivity("trip.created", { actorKind: "staff", actorId: staff.id, details: { id, clientId } });
  redirect(`/admin/viajes/${id}`);
}

export async function updateTripAction(id: string, _prev: State, fd: FormData): Promise<State> {
  const staff = await requireStaff("agent");
  const p = parseTripForm(fd);
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Revisá los datos." };
  await updateTrip(id, p.data);
  await autoPlan(id);
  await logActivity("trip.updated", { actorKind: "staff", actorId: staff.id, details: { id, status: p.data.status } });
  revalidatePath(`/admin/viajes/${id}`);
  return { ok: true };
}

export async function deleteTripAction(id: string) {
  const staff = await requireStaff("owner");
  await deleteTrip(id);
  await logActivity("trip.deleted", { actorKind: "staff", actorId: staff.id, details: { id } });
  redirect("/admin/viajes");
}

export async function saveItemAction(tripId: string, itemId: string | null, _prev: State, fd: FormData): Promise<State> {
  await requireStaff("agent");
  const p = parseItemForm(fd);
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Revisá los datos." };
  await saveItem(tripId, itemId, p.data);
  await autoPlan(tripId);
  revalidatePath(`/admin/viajes/${tripId}`);
  return { ok: true };
}

export async function deleteItemAction(tripId: string, itemId: string) {
  await requireStaff("agent");
  await deleteItem(tripId, itemId);
  revalidatePath(`/admin/viajes/${tripId}`);
}

export async function deleteFileAction(tripId: string, fileId: string) {
  await requireStaff("agent");
  await deleteFile(tripId, fileId);
  revalidatePath(`/admin/viajes/${tripId}`);
}

export async function savePlanAction(tripId: string, plan: unknown): Promise<{ ok: boolean; error?: string }> {
  await requireStaff("agent");
  const p = planInput.safeParse(plan);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Revisá el plan (los enlaces deben empezar con https://)." };
  await savePlan(tripId, p.data, false);
  return { ok: true };
}

export async function autoPlanAction(tripId: string) {
  await requireStaff("agent");
  await autoPlan(tripId);
  revalidatePath(`/admin/viajes/${tripId}`);
}

export async function clientAccessAction(clientId: string, _prev: { error?: string; link?: string; emailed?: boolean } | null, fd: FormData) {
  const staff = await requireStaff("agent");
  const r = await createClientAccess(clientId, String(fd.get("email") ?? ""));
  if (!r.ok) return { error: r.error };
  await logActivity("client.access_link", { actorKind: "staff", actorId: staff.id, details: { clientId, emailed: r.emailed } });
  return { link: r.link, emailed: r.emailed };
}
