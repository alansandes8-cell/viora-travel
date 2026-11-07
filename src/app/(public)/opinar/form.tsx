"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Star } from "lucide-react";
import { Button, Notice, cx, inputClass } from "@/components/ui";
import { submitTestimonialAction } from "@/components/quote/actions";

export function OpinarForm() {
  const [rating, setRating] = useState(5);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  if (done)
    return (
      <div className="rounded-2xl border border-teal-brand/30 bg-teal-brand/8 p-6" role="status">
        <p className="flex items-center gap-2 font-display text-2xl text-navy">
          <CheckCircle2 className="h-7 w-7 text-teal-brand" aria-hidden /> ¡Gracias de corazón!
        </p>
        <p className="mt-1 text-muted">Tu opinión nos ayuda muchísimo. La vamos a publicar en la web en los próximos días.</p>
      </div>
    );
  return (
    <form
      className="space-y-4 rounded-2xl border border-line bg-white p-5 shadow-soft"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError("");
        start(async () => {
          const r = await submitTestimonialAction({ ...Object.fromEntries(fd), rating, consent: fd.get("consent") === "on" });
          if (r.ok) setDone(true);
          else setError(r.error ?? "Revisá los datos.");
        });
      }}
    >
      <fieldset>
        <legend className="text-sm font-semibold text-navy">¿Cómo fue tu experiencia?</legend>
        <div className="mt-1 flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} estrellas`} aria-pressed={rating === n} className="p-1">
              <Star className={cx("h-8 w-8", n <= rating ? "fill-orange-brand text-orange-brand" : "text-line")} aria-hidden />
            </button>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-navy">
          Tu nombre (así se publica)
          <input name="name" required maxLength={60} placeholder="Ej.: Laura G." className={`${inputClass} mt-1`} />
        </label>
        <label className="block text-sm font-semibold text-navy">
          Tu ciudad
          <input name="city" maxLength={60} className={`${inputClass} mt-1`} />
        </label>
      </div>
      <label className="block text-sm font-semibold text-navy">
        ¿A dónde viajaste?
        <input name="trip" required maxLength={80} placeholder="Ej.: Disney en familia, Europa en pareja…" className={`${inputClass} mt-1`} />
      </label>
      <label className="block text-sm font-semibold text-navy">
        Contanos tu experiencia con VIORA
        <textarea name="text" required minLength={20} maxLength={600} rows={4} className={`${inputClass} mt-1`} />
      </label>
      <label className="block text-sm font-semibold text-navy">
        Tu WhatsApp o email <span className="font-normal text-muted">(opcional, no se publica)</span>
        <input name="contact" maxLength={120} className={`${inputClass} mt-1`} />
      </label>
      <label className="flex items-start gap-2 text-sm text-muted">
        <input type="checkbox" name="consent" required className="mt-1 h-4 w-4" />
        <span>Autorizo a VIORA TRAVEL a publicar mi opinión con mi nombre y ciudad en su web.</span>
      </label>
      {error && <Notice tone="danger">{error}</Notice>}
      <Button type="submit" disabled={pending}>
        {pending ? "Enviando…" : "Enviar mi opinión"}
      </Button>
    </form>
  );
}
