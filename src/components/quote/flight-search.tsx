"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeftRight, Minus, Plus, Search, X } from "lucide-react";
import { PlaceSearch } from "@/components/place-search";
import { Button, cx, inputClass } from "@/components/ui";

export type AirportOption = { iata: string; name: string; city: string; country: string };

export interface FlightFormValues {
  from: AirportOption | null;
  to: AirportOption | null;
  depart: string;
  ret: string;
  oneWay: boolean;
  adults: number;
  children: number;
  infants: number;
  cabin: string;
}

const CABINS = [
  ["economy", "Turista"],
  ["premium", "Premium economy"],
  ["business", "Ejecutiva"],
  ["first", "Primera"],
] as const;

function AirportPicker({ id, label, value, onChange }: { id: string; label: string; value: AirportOption | null; onChange: (a: AirportOption | null) => void }) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-white px-3 py-1.5 focus-within:border-cyan-brand focus-within:ring-2 focus-within:ring-cyan-brand/20">
      <label htmlFor={id} className="block text-xs font-bold uppercase tracking-wide text-muted">
        {label}
      </label>
      {value ? (
        <div className="flex min-h-9 items-center justify-between gap-2">
          <span className="truncate text-[15px]">
            <b className="text-navy">{value.city}</b> <span className="rounded bg-sand-2 px-1.5 text-xs font-bold text-navy">{value.iata}</span>
          </span>
          <button type="button" onClick={() => onChange(null)} className="rounded-full p-1.5 text-muted hover:bg-navy/5" aria-label={`Cambiar ${label.toLowerCase()}`}>
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : (
        <PlaceSearch<AirportOption>
          tipo="aeropuertos"
          id={id}
          placeholder="Ciudad o aeropuerto…"
          keyOf={(x) => x.iata}
          onPick={onChange}
          render={(x) => (
            <span className="flex items-baseline gap-2">
              <b className="text-navy">{x.city}</b>
              <span className="rounded bg-sand-2 px-1.5 text-xs font-bold text-navy">{x.iata}</span>
              <span className="truncate text-xs text-muted">
                {x.name} · {x.country}
              </span>
            </span>
          )}
        />
      )}
    </div>
  );
}

function Counter({ label, hint, value, min, max, onChange }: { label: string; hint: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-navy">{label}</p>
        <p className="text-xs text-muted">{hint}</p>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="flex h-9 w-9 items-center justify-center rounded-full border border-line disabled:opacity-40" aria-label={`Menos ${label.toLowerCase()}`}>
          <Minus className="h-4 w-4" aria-hidden />
        </button>
        <span className="w-5 text-center font-semibold tabular-nums" aria-live="polite">
          {value}
        </span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="flex h-9 w-9 items-center justify-center rounded-full border border-line disabled:opacity-40" aria-label={`Más ${label.toLowerCase()}`}>
          <Plus className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function FlightSearch({ initial }: { initial: FlightFormValues }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [error, setError] = useState("");
  const [paxOpen, setPaxOpen] = useState(false);
  const today = iso(new Date());
  const set = <K extends keyof FlightFormValues>(k: K, val: FlightFormValues[K]) => setV((x) => ({ ...x, [k]: val }));
  const pax = v.adults + v.children + v.infants;

  const submit = () => {
    if (!v.from || !v.to) return setError("Elegí el origen y el destino de la lista.");
    if (v.from.iata === v.to.iata) return setError("El origen y el destino tienen que ser distintos.");
    if (!v.depart) return setError("Elegí la fecha de ida.");
    if (!v.oneWay && (!v.ret || v.ret < v.depart)) return setError("La vuelta tiene que ser después de la ida.");
    setError("");
    const p = new URLSearchParams({ de: v.from.iata, a: v.to.iata, ida: v.depart, ad: String(v.adults), ni: String(v.children), be: String(v.infants), cl: v.cabin });
    if (!v.oneWay) p.set("vuelta", v.ret);
    router.push(`/vuelos?${p}#resultados`);
  };

  return (
    <form
      className="rounded-2xl border border-line bg-white p-4 shadow-lift sm:p-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="mb-3 flex gap-2" role="radiogroup" aria-label="Tipo de viaje">
        {[
          [false, "Ida y vuelta"],
          [true, "Solo ida"],
        ].map(([ow, label]) => (
          <button
            key={String(label)}
            type="button"
            role="radio"
            aria-checked={v.oneWay === ow}
            onClick={() => set("oneWay", ow as boolean)}
            className={cx("min-h-9 rounded-full border px-3.5 text-sm font-semibold", v.oneWay === ow ? "border-navy bg-navy text-white" : "border-line text-navy")}
          >
            {label as string}
          </button>
        ))}
      </div>
      <div className="grid gap-2 lg:grid-cols-[1fr_auto_1fr_1.3fr_1fr]">
        <AirportPicker id="vuelo-origen" label="Origen" value={v.from} onChange={(a) => set("from", a)} />
        <button
          type="button"
          onClick={() => setV((x) => ({ ...x, from: x.to, to: x.from }))}
          className="mx-auto flex h-9 w-9 items-center justify-center self-center rounded-full border border-line bg-white text-navy hover:bg-navy/5"
          aria-label="Invertir origen y destino"
        >
          <ArrowLeftRight className="h-4 w-4 rotate-90 lg:rotate-0" aria-hidden />
        </button>
        <AirportPicker id="vuelo-destino" label="Destino" value={v.to} onChange={(a) => set("to", a)} />
        <div className="grid grid-cols-2 gap-2">
          <label className="block rounded-xl border border-line px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-muted">
            Ida
            <input
              type="date"
              min={today}
              value={v.depart}
              onChange={(e) => setV((x) => ({ ...x, depart: e.target.value, ret: x.ret && x.ret < e.target.value ? "" : x.ret }))}
              className="block min-h-9 w-full bg-transparent text-[15px] font-normal normal-case tracking-normal text-ink outline-none"
            />
          </label>
          <label className={cx("block rounded-xl border border-line px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-muted", v.oneWay && "opacity-40")}>
            Vuelta
            <input
              type="date"
              min={v.depart || today}
              value={v.oneWay ? "" : v.ret}
              disabled={v.oneWay}
              onChange={(e) => set("ret", e.target.value)}
              className="block min-h-9 w-full bg-transparent text-[15px] font-normal normal-case tracking-normal text-ink outline-none"
            />
          </label>
        </div>
        <div className="relative">
          <button type="button" onClick={() => setPaxOpen((o) => !o)} aria-expanded={paxOpen} className="block h-full w-full rounded-xl border border-line px-3 py-1.5 text-left">
            <span className="block text-xs font-bold uppercase tracking-wide text-muted">Pasajeros y clase</span>
            <span className="block min-h-9 truncate pt-1.5 text-[15px]">
              {pax} {pax === 1 ? "pasajero" : "pasajeros"} · {CABINS.find((c) => c[0] === v.cabin)?.[1]}
            </span>
          </button>
          {paxOpen && (
            <div className="absolute right-0 top-full z-30 mt-1 w-[min(20rem,calc(100vw-2rem))] space-y-3 rounded-2xl border border-line bg-white p-4 shadow-lift">
              <Counter label="Adultos" hint="12 años o más" value={v.adults} min={1} max={9} onChange={(n) => set("adults", n)} />
              <Counter label="Niños" hint="2 a 11 años" value={v.children} min={0} max={8} onChange={(n) => set("children", n)} />
              <Counter label="Bebés" hint="Menores de 2, en brazos" value={v.infants} min={0} max={v.adults} onChange={(n) => set("infants", n)} />
              <label className="block text-sm font-semibold text-navy">
                Clase
                <select value={v.cabin} onChange={(e) => set("cabin", e.target.value)} className={`${inputClass} mt-1`}>
                  {CABINS.map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <Button type="button" variant="secondary" className="w-full" onClick={() => setPaxOpen(false)}>
                Listo
              </Button>
            </div>
          )}
        </div>
      </div>
      {error && (
        <p className="mt-2 text-sm font-semibold text-coral-brand" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" className="mt-3 w-full py-3 text-base sm:w-auto sm:px-8">
        <Search className="h-4 w-4" aria-hidden /> Buscar vuelos
      </Button>
    </form>
  );
}
