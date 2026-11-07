"use client";

import { useActionState } from "react";
import { Button, Notice, inputClass } from "@/components/ui";
import { addTestimonialAction } from "./actions";

export function AddTestimonialForm() {
  const [state, action, pending] = useActionState(addTestimonialAction, null);
  return (
    <form action={action} className="grid min-w-0 gap-3 sm:grid-cols-2">
      <label className="block text-sm font-semibold text-navy">
        Nombre (como se publica)
        <input name="name" required maxLength={60} placeholder="Ej.: Laura G." className={`${inputClass} mt-1`} />
      </label>
      <label className="block text-sm font-semibold text-navy">
        Ciudad
        <input name="city" maxLength={60} placeholder="Ej.: Rosario" className={`${inputClass} mt-1`} />
      </label>
      <label className="block text-sm font-semibold text-navy">
        Viaje
        <input name="trip" required maxLength={80} placeholder="Ej.: Disney en familia" className={`${inputClass} mt-1`} />
      </label>
      <label className="block text-sm font-semibold text-navy">
        Puntaje
        <select name="rating" defaultValue="5" className={`${inputClass} mt-1`}>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {"★".repeat(n)}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-semibold text-navy sm:col-span-2">
        Comentario (copiado del mensaje real del cliente)
        <textarea name="text" required minLength={20} maxLength={600} rows={3} className={`${inputClass} mt-1`} />
      </label>
      <label className="block text-sm font-semibold text-navy sm:col-span-2">
        Contacto del cliente <span className="font-normal text-muted">(interno, no se publica)</span>
        <input name="contact" maxLength={120} className={`${inputClass} mt-1`} />
      </label>
      {state?.error && <Notice tone="danger">{state.error}</Notice>}
      {state?.ok && <Notice tone="success">Opinión publicada.</Notice>}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Publicar opinión"}
        </Button>
      </div>
    </form>
  );
}
