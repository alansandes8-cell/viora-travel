"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Minus, Plus, Search, Star, X } from "lucide-react";
import { PlaceSearch } from "@/components/place-search";
import { Button, cx } from "@/components/ui";

type PlaceOption = { kind: "city" | "country"; label: string; detail?: string };
export interface HotelFormValues {
  city: { label: string; country: string } | null;
  checkin: string;
  checkout: string;
  guests: number;
  stars: number;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function HotelSearch({ initial }: { initial: HotelFormValues }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [error, setError] = useState("");
  const today = iso(new Date());

  return (
    <form
      className="rounded-2xl border border-line bg-white p-4 shadow-lift sm:p-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!v.city) return setError("Elegí la ciudad de la lista.");
        if (!v.checkin || !v.checkout || v.checkout <= v.checkin) return setError("Revisá las fechas: la salida tiene que ser después de la entrada.");
        setError("");
        const p = new URLSearchParams({ ciudad: v.city.label, pais: v.city.country, entrada: v.checkin, salida: v.checkout, hu: String(v.guests), est: String(v.stars) });
        router.push(`/hoteles?${p}#resultados`);
      }}
    >
      <div className="grid gap-2 lg:grid-cols-[1.4fr_1.3fr_1fr]">
        <div className="min-w-0 rounded-xl border border-line px-3 py-1.5 focus-within:border-cyan-brand focus-within:ring-2 focus-within:ring-cyan-brand/20">
          <label htmlFor="hotel-ciudad" className="block text-xs font-bold uppercase tracking-wide text-muted">
            ¿A dónde vas?
          </label>
          {v.city ? (
            <div className="flex min-h-9 items-center justify-between gap-2">
              <span className="truncate text-[15px]">
                <b className="text-navy">{v.city.label}</b> <span className="text-muted">· {v.city.country}</span>
              </span>
              <button type="button" onClick={() => setV((x) => ({ ...x, city: null }))} className="rounded-full p-1.5 text-muted hover:bg-navy/5" aria-label="Cambiar ciudad">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ) : (
            <PlaceSearch<PlaceOption>
              tipo="lugares"
              id="hotel-ciudad"
              placeholder="Ciudad o destino…"
              keyOf={(x) => `${x.kind}:${x.label}:${x.detail ?? ""}`}
              onPick={(x) => setV((s) => ({ ...s, city: { label: x.label, country: x.kind === "country" ? x.label : (x.detail ?? "") } }))}
              render={(x) => (
                <span>
                  <b className="text-navy">{x.label}</b> <span className="text-muted">· {x.kind === "country" ? "País" : x.detail}</span>
                </span>
              )}
            />
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["checkin", "Entrada", today],
              ["checkout", "Salida", v.checkin || today],
            ] as const
          ).map(([k, label, min]) => (
            <label key={k} className="block rounded-xl border border-line px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-muted">
              {label}
              <input
                type="date"
                min={min}
                value={v[k]}
                onChange={(e) => setV((x) => ({ ...x, [k]: e.target.value }))}
                className="block min-h-9 w-full bg-transparent text-[15px] font-normal normal-case tracking-normal text-ink outline-none"
              />
            </label>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-muted">Personas</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setV((x) => ({ ...x, guests: Math.max(1, x.guests - 1) }))} className="flex h-9 w-9 items-center justify-center rounded-full border border-line" aria-label="Menos personas">
              <Minus className="h-4 w-4" aria-hidden />
            </button>
            <span className="w-5 text-center font-semibold tabular-nums">{v.guests}</span>
            <button type="button" onClick={() => setV((x) => ({ ...x, guests: Math.min(10, x.guests + 1) }))} className="flex h-9 w-9 items-center justify-center rounded-full border border-line" aria-label="Más personas">
              <Plus className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Categoría del hotel">
        {[3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={v.stars === s}
            onClick={() => setV((x) => ({ ...x, stars: s }))}
            className={cx("inline-flex min-h-9 items-center gap-1 rounded-full border px-3.5 text-sm font-semibold", v.stars === s ? "border-navy bg-navy text-white" : "border-line text-navy")}
          >
            {s} <Star className="h-3.5 w-3.5 fill-current" aria-hidden /> <span className="sr-only">estrellas</span>
          </button>
        ))}
      </div>
      {error && (
        <p className="mt-2 text-sm font-semibold text-coral-brand" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" className="mt-3 w-full py-3 text-base sm:w-auto sm:px-8">
        <Search className="h-4 w-4" aria-hidden /> Buscar hoteles
      </Button>
    </form>
  );
}
