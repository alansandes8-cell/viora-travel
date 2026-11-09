"use client";

import { useActionState, useState, startTransition } from "react";
import Link from "next/link";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { Button, Notice, inputClass, keepFields } from "@/components/ui";
import { loginAction, resetAction, setPasswordAction } from "./actions";

const label = "block text-sm font-semibold text-navy";

function PasswordInput({ name, autoComplete }: { name: string; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative mt-1 block">
      <input name={name} type={show ? "text" : "password"} required minLength={name === "password" && autoComplete === "current-password" ? 1 : 8} maxLength={200} autoComplete={autoComplete} className={`${inputClass} pr-11`} />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted hover:bg-navy/5">
        {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
      </button>
    </span>
  );
}

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null);
  return (
    <form onSubmit={keepFields(action, startTransition)} className="space-y-4">
      <label className={label}>
        Email
        <input name="email" type="email" required autoComplete="username" className={`${inputClass} mt-1`} />
      </label>
      <label className={label}>
        Contraseña
        <PasswordInput name="password" autoComplete="current-password" />
      </label>
      {state?.error && <Notice tone="danger">{state.error}</Notice>}
      <Button type="submit" disabled={pending} className="w-full py-3">
        <LogIn className="h-4 w-4" aria-hidden /> {pending ? "Entrando…" : "Entrar a Mi viaje"}
      </Button>
      <p className="text-center text-sm">
        <Link href="/acceder/recuperar" className="font-semibold text-navy underline">
          Olvidé mi contraseña
        </Link>
      </p>
    </form>
  );
}

export function SetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(setPasswordAction.bind(null, token), null);
  return (
    <form onSubmit={keepFields(action, startTransition)} className="space-y-4">
      <label className={label}>
        Elegí tu contraseña
        <PasswordInput name="password" autoComplete="new-password" />
        <span className="mt-1 block text-xs font-normal text-muted">Al menos 8 caracteres, con letras y números.</span>
      </label>
      <label className={label}>
        Repetila
        <PasswordInput name="confirm" autoComplete="new-password" />
      </label>
      {state?.error && <Notice tone="danger">{state.error}</Notice>}
      <Button type="submit" disabled={pending} className="w-full py-3">
        {pending ? "Guardando…" : "Guardar y ver mi viaje"}
      </Button>
    </form>
  );
}

export function ResetForm() {
  const [state, action, pending] = useActionState(resetAction, null);
  if (state?.sent)
    return (
      <Notice tone="success">
        {state.emailEnabled
          ? "Si ese email tiene acceso, te mandamos un enlace para elegir una nueva contraseña. Revisá tu bandeja (y la de spam)."
          : "Escribile a tu asesor por WhatsApp y te manda un enlace nuevo para elegir tu contraseña."}
      </Notice>
    );
  return (
    <form onSubmit={keepFields(action, startTransition)} className="space-y-4">
      <label className={label}>
        Tu email
        <input name="email" type="email" required autoComplete="username" className={`${inputClass} mt-1`} />
      </label>
      <Button type="submit" disabled={pending} className="w-full py-3">
        {pending ? "Enviando…" : "Recuperar contraseña"}
      </Button>
    </form>
  );
}
