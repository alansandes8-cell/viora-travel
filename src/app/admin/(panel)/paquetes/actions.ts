"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/server/activity";
import { requireStaff } from "@/server/auth/session";
import { deletePackage, parsePackageForm, savePackage } from "@/server/services/packages";

export async function savePackageAction(id: string | null, _prev: { error?: string } | null, fd: FormData): Promise<{ error?: string } | null> {
  const staff = await requireStaff("agent");
  const parsed = await parsePackageForm(fd);
  if (!parsed.ok) return { error: parsed.error };
  const r = await savePackage(id, parsed.data);
  if (!r.ok) return { error: r.error };
  await logActivity(id ? "package.updated" : "package.created", { actorKind: "staff", actorId: staff.id, details: { id: r.id, title: parsed.data.title, status: parsed.data.status } });
  revalidatePath("/admin/paquetes");
  revalidatePath("/paquetes");
  redirect("/admin/paquetes");
}

export async function deletePackageAction(id: string) {
  const staff = await requireStaff("owner");
  await deletePackage(id);
  await logActivity("package.deleted", { actorKind: "staff", actorId: staff.id, details: { id } });
  revalidatePath("/admin/paquetes");
  revalidatePath("/paquetes");
  redirect("/admin/paquetes");
}
