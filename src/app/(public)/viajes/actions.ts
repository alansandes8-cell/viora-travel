"use server";

import { redirect } from "next/navigation";
import { forgetSavedTrip, openSavedTrip, startNewTrip } from "@/server/services/client-flow";

export async function newTripAction() {
  await startNewTrip();
  redirect("/planificar");
}

export async function openTripAction(formData: FormData) {
  const r = await openSavedTrip(String(formData.get("id") ?? ""));
  redirect(r.ok && r.hasProposal ? "/viaje" : "/planificar");
}

export async function forgetTripAction(formData: FormData) {
  await forgetSavedTrip(String(formData.get("id") ?? ""));
  redirect("/viajes");
}
