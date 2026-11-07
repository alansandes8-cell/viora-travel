"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/server/activity";
import { requireStaff } from "@/server/auth/session";
import { setLeadStatus } from "@/server/services/leads";

export async function setLeadStatusAction(id: string, status: string) {
  const staff = await requireStaff("agent");
  await setLeadStatus(id, status);
  await logActivity("quote.status", { actorKind: "staff", actorId: staff.id, details: { id, status } });
  revalidatePath("/admin/consultas");
  revalidatePath("/admin");
}
