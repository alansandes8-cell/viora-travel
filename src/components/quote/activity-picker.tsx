"use client";

import { useState } from "react";
import { Baby, Check, Clock, Ticket } from "lucide-react";
import type { ActivityEstimate } from "@/core/fares";
import { Card, cx } from "@/components/ui";
import { QuoteForm } from "./quote-form";

const KIND_LABEL: Record<string, string> = {
  museum: "Museo",
  sight: "Paseo",
  tour: "Tour",
  daytrip: "Excursión de día",
  beach: "Playa",
  nature: "Naturaleza",
  food: "Gastronomía",
  experience: "Experiencia",
  park: "Parque",
  nightlife: "Noche",
  shopping: "Compras",
};
const usd = (n: number) => Math.round(n).toLocaleString("es-AR");

/** Lista de actividades con precio estimado; la persona marca las que le interesan y pide cotización. */
export function ActivityPicker({ destination, items, people, date }: { destination: string; items: ActivityEstimate[]; people: number; date: string }) {
  const [sel, setSel] = useState<string[]>([]);
  const chosen = items.filter((i) => sel.includes(i.id));
  const total = chosen.reduce<[number, number]>((a, i) => (i.perAdult ? [a[0] + i.perAdult[0], a[1] + i.perAdult[1]] : a), [0, 0]);
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((a) => {
          const on = sel.includes(a.id);
          return (
            <li key={a.id}>
              <button type="button" onClick={() => toggle(a.id)} aria-pressed={on} className="block h-full w-full text-left">
                <Card className={cx("flex h-full gap-3 p-4 transition-shadow hover:shadow-lift", on && "ring-2 ring-teal-brand")}>
                  <span className={cx("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border", on ? "border-teal-brand bg-teal-brand text-white" : "border-line")}>{on && <Check className="h-4 w-4" aria-hidden />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-navy">{a.name}</span>
                    <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                      <span className="inline-flex items-center gap-1">
                        <Ticket className="h-3.5 w-3.5" aria-hidden /> {KIND_LABEL[a.kind] ?? a.kind}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" aria-hidden /> {a.hours} h
                      </span>
                      {a.kidsOk && (
                        <span className="inline-flex items-center gap-1">
                          <Baby className="h-3.5 w-3.5" aria-hidden /> Apto chicos
                        </span>
                      )}
                      {a.booking === "required" && <span className="font-semibold text-coral-brand">Conviene reservar antes</span>}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    {a.perAdult ? (
                      <>
                        <span className="block text-xs text-muted">desde</span>
                        <span className="block font-bold text-navy">US$ {usd(a.perAdult[0])}</span>
                        <span className="block text-xs text-muted">a {usd(a.perAdult[1])}</span>
                      </>
                    ) : (
                      <span className="block text-sm font-semibold text-teal-brand">{a.free ? "Libre o bajo costo" : "Consultar"}</span>
                    )}
                  </span>
                </Card>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="sticky bottom-3 z-20 mt-4 rounded-2xl border border-line bg-white/95 p-4 shadow-lift backdrop-blur" aria-live="polite">
        {chosen.length ? (
          <p className="text-sm text-navy">
            <strong>{chosen.length} elegidas</strong> · estimado por adulto: US$ {usd(total[0])} – {usd(total[1])}
            {people > 1 && <span className="text-muted"> (≈ US$ {usd(total[0] * people)} – {usd(total[1] * people)} para {people})</span>}
          </p>
        ) : (
          <p className="text-sm text-muted">Tocá las actividades que te interesan y pedí la cotización.</p>
        )}
      </div>
      <div className="mt-6">
        <QuoteForm
          kind="activity"
          summary={`Actividades en ${destination}${date ? ` · desde ${date}` : ""} · ${people} personas${chosen.length ? ` · ${chosen.map((c) => c.name).join(", ")}` : ""}`.slice(0, 300)}
          details={{ destination, people, date, activities: chosen.map((c) => c.name), estimatePerAdult: total }}
          title="Te reservamos las actividades"
          intro="Un asesor te confirma precios, horarios y disponibilidad, y te arma el día a día. También podemos sumar entradas a parques, traslados y excursiones privadas."
        />
      </div>
    </>
  );
}
