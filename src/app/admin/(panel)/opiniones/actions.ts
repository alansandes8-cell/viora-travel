"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/server/activity";
import { requireStaff } from "@/server/auth/session";
import { addTestimonial, setTestimonialStatus } from "@/server/services/leads";

export async function addTestimonialAction(_prev: { error?: string; ok?: boolean; n?: number } | null, fd: FormData) {
  const staff = await requireStaff("agent");
  const r = await addTestimonial(Object.fromEntries(fd));
  if (!r.ok) return { error: r.error };
  await logActivity("testimonial.added", { actorKind: "staff", actorId: staff.id, details: { name: fd.get("name") } });
  revalidatePath("/admin/opiniones");
  revalidatePath("/");
  return { ok: true, n: Date.now() };
}

export async function setTestimonialStatusAction(id: string, status: "approved" | "hidden" | "pending" | "delete") {
  const staff = await requireStaff("agent");
  await setTestimonialStatus(id, status);
  await logActivity("testimonial.status", { actorKind: "staff", actorId: staff.id, details: { id, status } });
  revalidatePath("/admin/opiniones");
  revalidatePath("/");
}
