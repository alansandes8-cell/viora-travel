"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { chooseAlternative, requestChange, requestQuote, resumeLink, shareProposal } from "@/server/services/client-flow";

export async function chooseAlternativeAction(formData: FormData) {
  const id = String(formData.get("alternativeId") ?? "");
  const r = await chooseAlternative(id);
  if (!r.ok) throw new Error(r.error);
  revalidatePath("/viaje", "layout");
  redirect("/viaje/itinerario");
}

export async function requestChangeAction(text: string) {
  const r = await requestChange(text);
  revalidatePath("/viaje", "layout");
  return r;
}

export async function shareAction() {
  return shareProposal();
}

export async function resumeLinkAction() {
  return resumeLink();
}

export async function requestQuoteAction(data: unknown) {
  return requestQuote(data);
}
