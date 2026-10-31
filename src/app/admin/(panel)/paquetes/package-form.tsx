"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { ghostBtn, smallBtn, smallInput } from "@/components/admin/bits";
import { PACKAGE_CATEGORIES } from "@/core/packages";

type Pkg = {
  title: string;
  slug: string;
  category: string;
  summary: string;
  stops: { destinationId: string; nights: number }[];
  includes: string[];
  excludes: string[];
  priceFrom: string | null;
  currency: string;
  priceNote: string;
  departures: string;
  imageUrl: string | null;
  status: string;
  sort: number;
};

const label = "block text-xs font-bold uppercase tracking-wide text-muted";

/** Formulario de paquete: destinos de la biblioteca con sus noches, precio «desde» y lo que incluye. */
export function PackageForm({ initial, destinations, action }: { initial: Pkg | null; destinations: { id: string; name: string }[]; action: (prev: { error?: string } | null, fd: FormData) => Promise<{ error?: string } | null> }) {
  const [state, formAction, pending] = useActionState(action, null);
  const [stops, setStops] = useState(initial?.stops.length ? initial.stops : [{ destinationId: "", nights: 5 }]);
  const p = initial;
  return (
    <form action={formAction} className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-2 [&_label]:min-w-0 [&_select]:min-w-0 [&_input]:min-w-0 [&>div]:min-w-0">
      <div className="space-y-4">
        <label className="block">
          <span className={label}>Título</span>
          <input name="title" required maxLength={120} defaultValue={p?.title} className={`${smallInput} mt-1 w-full`} placeholder="Ej.: Disney + Miami" />
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={label}>Experiencia</span>
            <select name="category" defaultValue={p?.category ?? "disney"} className={`${smallInput} mt-1 w-full`}>
              {PACKAGE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={label}>Estado</span>
            <select name="status" defaultValue={p?.status ?? "draft"} className={`${smallInput} mt-1 w-full`}>
              <option value="draft">Borrador (no se ve en la web)</option>
              <option value="published">Publicado</option>
            </select>
          </label>
        </div>
        <label className="block">
          <span className={label}>Descripción corta</span>
          <textarea name="summary" rows={3} maxLength={400} defaultValue={p?.summary} className={`${smallInput} mt-1 w-full`} />
        </label>
        <fieldset className="min-w-0">
          <legend className={label}>Recorrido (destinos y noches)</legend>
          <div className="mt-1 space-y-2">
            {stops.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <select name="stop_dest" value={s.destinationId} onChange={(e) => setStops(stops.map((x, j) => (j === i ? { ...x, destinationId: e.target.value } : x)))} className={`${smallInput} min-w-0 flex-1`} aria-label={`Destino ${i + 1}`}>
                  <option value="">Elegí un destino…</option>
                  {destinations.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <input name="stop_nights" type="number" min={1} max={60} value={s.nights} onChange={(e) => setStops(stops.map((x, j) => (j === i ? { ...x, nights: Number(e.target.value) } : x)))} className={`${smallInput} w-16`} aria-label={`Noches en destino ${i + 1}`} />
                <span className="text-xs text-muted">noches</span>
                <button type="button" onClick={() => setStops(stops.filter((_, j) => j !== i))} disabled={stops.length === 1} aria-label="Quitar destino" className="rounded p-1 text-muted hover:text-danger disabled:opacity-30">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setStops([...stops, { destinationId: "", nights: 3 }])} className={ghostBtn} disabled={stops.length >= 8}>
              <Plus className="h-4 w-4" /> Agregar destino
            </button>
          </div>
        </fieldset>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
          <label className="block">
            <span className={label}>Precio «desde» (vacío = «Consultá el precio»)</span>
            <input name="priceFrom" inputMode="decimal" defaultValue={p?.priceFrom ? String(Math.round(Number(p.priceFrom))) : ""} className={`${smallInput} mt-1 w-full`} placeholder="Ej.: 1890" />
          </label>
          <label className="block">
            <span className={label}>Moneda</span>
            <select name="currency" defaultValue={p?.currency ?? "USD"} className={`${smallInput} mt-1`}>
              <option value="USD">US$</option>
              <option value="EUR">€</option>
              <option value="ARS">$ (pesos)</option>
            </select>
          </label>
        </div>
        <label className="block">
          <span className={label}>Aclaración del precio</span>
          <input name="priceNote" maxLength={120} defaultValue={p?.priceNote ?? "por persona, en base doble"} className={`${smallInput} mt-1 w-full`} />
        </label>
        <label className="block">
          <span className={label}>Salidas / vigencia</span>
          <input name="departures" maxLength={300} defaultValue={p?.departures} className={`${smallInput} mt-1 w-full`} placeholder="Ej.: Salidas de marzo a noviembre 2027" />
        </label>
        <label className="block">
          <span className={label}>Incluye (uno por renglón)</span>
          <textarea name="includes" rows={4} defaultValue={p?.includes.join("\n")} className={`${smallInput} mt-1 w-full`} placeholder={"Vuelos ida y vuelta desde Buenos Aires\nHotel 4★ con desayuno\nTraslados aeropuerto–hotel"} />
        </label>
        <label className="block">
          <span className={label}>No incluye (uno por renglón)</span>
          <textarea name="excludes" rows={3} defaultValue={p?.excludes.join("\n")} className={`${smallInput} mt-1 w-full`} />
        </label>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
          <label className="block">
            <span className={label}>Foto propia (enlace https, opcional)</span>
            <input name="imageUrl" maxLength={500} defaultValue={p?.imageUrl ?? ""} className={`${smallInput} mt-1 w-full`} placeholder="Si queda vacío, se usa una foto real del destino" />
          </label>
          <label className="block">
            <span className={label}>Orden</span>
            <input name="sort" type="number" min={0} max={10000} defaultValue={p?.sort ?? 100} className={`${smallInput} mt-1 w-20`} />
          </label>
        </div>
        <input type="hidden" name="slug" defaultValue={p?.slug ?? ""} />
        {state?.error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>}
        <button type="submit" disabled={pending} className={smallBtn}>
          {pending ? "Guardando…" : "Guardar paquete"}
        </button>
      </div>
    </form>
  );
}
