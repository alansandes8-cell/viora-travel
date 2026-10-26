"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, MessageCircle } from "lucide-react";
import Link from "next/link";
import { Button, Field, Notice, inputClass } from "@/components/ui";

type Result = { ok: boolean; error?: string; fields?: Record<string, string>; notified?: "sent" | "not_configured" | "failed" };

export function QuoteForm({ action, whatsappHref }: { action: (d: unknown) => Promise<Result>; whatsappHref: string | null }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", preferredChannel: "whatsapp", message: "", consent: false });
  const [res, setRes] = useState<Result | null>(null);
  const [pending, start] = useTransition();
  if (res?.ok) {
    return (
      <div className="space-y-4">
        <Notice tone="success">
          <p className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-4 w-4" aria-hidden /> Registramos tu solicitud.
          </p>
          <p className="mt-1">
            {res.notified === "sent"
              ? "Avisamos al equipo de VIORA y un asesor se va a comunicar con vos."
              : "Tu pedido quedó guardado en el panel de VIORA y un asesor lo va a revisar. Si querés acelerar el contacto, escribinos por WhatsApp."}
          </p>
        </Notice>
        {whatsappHref && (
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#1f9d55] px-5 py-2.5 text-sm font-semibold text-white">
            <MessageCircle className="h-4 w-4" aria-hidden /> Escribir por WhatsApp
          </a>
        )}
      </div>
    );
  }
  const f = res?.fields ?? {};
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => setRes(await action(form)));
      }}
    >
      <Field label="Nombre" htmlFor="qn" error={f.name}>
        <input id="qn" required autoComplete="name" className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email" htmlFor="qe" error={f.email}>
          <input id="qe" type="email" autoComplete="email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Teléfono / WhatsApp" htmlFor="qp" error={f.phone}>
          <input id="qp" type="tel" autoComplete="tel" className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
      </div>
      <Field label="¿Cómo preferís que te contactemos?" htmlFor="qc">
        <select id="qc" className={inputClass} value={form.preferredChannel} onChange={(e) => setForm({ ...form, preferredChannel: e.target.value })}>
          <option value="whatsapp">WhatsApp</option>
          <option value="email">Email</option>
          <option value="phone">Llamada</option>
        </select>
      </Field>
      <Field label="¿Algo más que quieras contarnos?" htmlFor="qm">
        <textarea id="qm" rows={3} maxLength={1500} className={inputClass} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
      </Field>
      <label className="flex items-start gap-2 text-sm text-muted">
        <input type="checkbox" className="mt-1" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} />
        <span>
          Acepto que VIORA TRAVEL use estos datos para contactarme sobre este viaje, según la{" "}
          <Link href="/privacidad" className="underline" target="_blank">
            política de privacidad
          </Link>
          .
        </span>
      </label>
      {f.consent && <p className="text-xs font-semibold text-danger">{f.consent}</p>}
      {res?.error && <Notice tone="danger">{res.error}</Notice>}
      <Button disabled={pending} className="w-full sm:w-auto">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />} Solicitar propuesta personalizada
      </Button>
    </form>
  );
}
