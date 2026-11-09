"use server";

import { redirect } from "next/navigation";
import { clientLogin, clientLogout, requestPasswordReset, setPasswordWithToken } from "@/server/auth/client-session";

type State = { error?: string; sent?: boolean; emailEnabled?: boolean } | null;

export async function loginAction(_prev: State, fd: FormData): Promise<State> {
  const r = await clientLogin(String(fd.get("email") ?? ""), String(fd.get("password") ?? ""));
  if (!r.ok) return { error: r.error };
  redirect("/mi-viaje");
}

export async function setPasswordAction(token: string, _prev: State, fd: FormData): Promise<State> {
  const r = await setPasswordWithToken(token, String(fd.get("password") ?? ""), String(fd.get("confirm") ?? ""));
  if (!r.ok) return { error: r.error };
  redirect("/mi-viaje");
}

export async function resetAction(_prev: State, fd: FormData): Promise<State> {
  const r = await requestPasswordReset(String(fd.get("email") ?? ""));
  return { sent: true, emailEnabled: r.emailEnabled };
}

export async function logoutAction() {
  await clientLogout();
  redirect("/acceder");
}
