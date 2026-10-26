"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { login, logout } from "@/server/auth/session";

const schema = z.object({ email: z.string().email().max(200), password: z.string().min(1).max(200), totp: z.string().max(10).optional() });

export async function loginAction(_prev: unknown, formData: FormData) {
  const parsed = schema.safeParse({ email: formData.get("email"), password: formData.get("password"), totp: formData.get("totp") || undefined });
  const email = String(formData.get("email") ?? "").slice(0, 200);
  if (!parsed.success) return { error: "Completá email y contraseña.", needTotp: false, email };
  const r = await login(parsed.data.email, parsed.data.password, parsed.data.totp);
  if (!r.ok) return { error: r.error, needTotp: !!r.needTotp, email };
  redirect("/admin");
}

export async function logoutAction() {
  await logout();
  redirect("/admin/login");
}
