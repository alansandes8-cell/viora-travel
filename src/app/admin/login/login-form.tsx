"use client";

import { useActionState } from "react";
import { Button, Field, Notice, inputClass } from "@/components/ui";
import { loginAction } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, { error: "", needTotp: false, email: "" });
  return (
    <form action={action} className="mt-6 space-y-4">
      <Field label="Email" htmlFor="email">
        <input id="email" name="email" type="email" autoComplete="username" required className={inputClass} defaultValue={state.email} key={state.email} />
      </Field>
      <Field label="Contraseña" htmlFor="password">
        <input id="password" name="password" type="password" autoComplete="current-password" required className={inputClass} />
      </Field>
      {state.needTotp && (
        <Field label="Código de verificación (6 dígitos)" htmlFor="totp">
          <input id="totp" name="totp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className={inputClass} autoFocus />
        </Field>
      )}
      {state.error && <Notice tone="danger">{state.error}</Notice>}
      <Button className="w-full" disabled={pending}>
        {pending ? "Ingresando…" : "Ingresar"}
      </Button>
    </form>
  );
}
