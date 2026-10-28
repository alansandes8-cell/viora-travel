"use server";

import { sendViorita, startViorita, vioritaState } from "@/server/services/viorita";

export async function vioritaStateAction() {
  return vioritaState();
}

export async function startVioritaAction(input: unknown) {
  return startViorita(input);
}

export async function sendVioritaAction(text: string) {
  return sendViorita(text);
}
