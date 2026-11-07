"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { Button, Notice, inputClass } from "@/components/ui";
import { requestQuoteAction } from "./actions";

/**
 * «Pedí tu cotización»: datos de contacto con consentimiento explícito. Se guarda como pedido
 * en el panel (Consultas) y se avisa a la agencia por email si está configurado.
 */
export function QuoteForm({
  kind,
  summary,
  details,
  title = "¿Te armamos la cotización real?",
  intro = "Un asesor de VIORA busca las mejores opciones disponibles y te escribe con el precio final. Sin compromiso.",
  cta = "Quiero mi cotización",
}: {
  kind: string;
  summary: string;
  details: Record<string, unknown>;
  title?: string;
  intro?: string;
  cta?: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  if (done)
    return (
      <div className="rounded-2xl border border-teal-brand/30 bg-teal-brand/8 p-5" role="status">
        <p className="flex items-center gap-2 font-display text-xl text-navy">
          <CheckCircle2 className="h-6 w-6 text-teal-brand" aria-hidden /> ¡Listo! Ya tenemos tu pedido
        </p>
        <p className="mt-1 text-muted">Un asesor te va a escribir a la brevedad con opciones y precios reales. Revisá tu WhatsApp o tu email.</p>
      </div>
    );

  return (
    <form
      className="rounded-2xl border border-line bg-white p-5 shadow-soft"
      data-quote-form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError("");
        start(async () => {
          const r = await requestQuoteAction(
            { kind, summary, details },
            { name: fd.get("name"), email: fd.get("email"), phone: fd.get("phone"), message: fd.get("message") ?? "", consent: fd.get("consent") === "on" },
          );
          if (r.ok) setDone(true);
          else setError(r.error);
        });
      }}
    >
      <p className="font-display text-xl text-navy">{title}</p>
      <p className="mt-1 text-sm text-muted">{intro}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="block text-sm font-semibold text-navy">
          Tu nombre
          <input name="name" required minLength={2} maxLength={80} autoComplete="name" className={`${inputClass} mt-1`} />
        </label>
        <label className="block text-sm font-semibold text-navy">
          WhatsApp
          <input name="phone" type="tel" maxLength={30} autoComplete="tel" placeholder="+54 9 11 …" className={`${inputClass} mt-1`} />
        </label>
        <label className="block text-sm font-semibold text-navy">
          Email
          <input name="email" type="email" maxLength={120} autoComplete="email" className={`${inputClass} mt-1`} />
        </label>
      </div>
      <label className="mt-3 block text-sm font-semibold text-navy">
        ¿Algo más que tengamos que saber? <span className="font-normal text-muted">(opcional)</span>
        <textarea name="message" rows={2} maxLength={800} className={`${inputClass} mt-1`} placeholder="Ej.: preferimos vuelos sin escalas, viajamos con valija grande…" />
      </label>
      <label className="mt-3 flex items-start gap-2 text-sm text-muted">
        <input type="checkbox" name="consent" required className="mt-1 h-4 w-4 accent-[var(--color-teal-brand)]" />
        <span>
          Acepto que VIORA TRAVEL me contacte por este pedido. Ver{" "}
          <a href="/privacidad" className="underline" target="_blank">
            privacidad
          </a>
          .
        </span>
      </label>
      {error && (
        <Notice tone="danger" className="mt-3">
          {error}
        </Notice>
      )}
      <Button type="submit" disabled={pending} className="mt-4 w-full sm:w-auto">
        <Send className="h-4 w-4" aria-hidden /> {pending ? "Enviando…" : cta}
      </Button>
      <p className="mt-2 text-xs text-muted">Dejanos al menos un WhatsApp o un email.</p>
    </form>
  );
}
