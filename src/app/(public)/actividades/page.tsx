import type { Metadata } from "next";
import { ExternalLink, Search } from "lucide-react";
import { estimateActivities } from "@/core/fares";
import { Button, Container, inputClass } from "@/components/ui";
import { ActivityPicker } from "@/components/quote/activity-picker";
import { EstimateNote, intParam, isoParam } from "@/components/quote/estimate-bits";
import { TravelTabs } from "@/components/quote/travel-tabs";
import { referenceLink } from "@/server/reference-links";
import { loadLibrary } from "@/server/settings";

export const metadata: Metadata = { title: "Actividades y excursiones", description: "Excursiones, entradas y experiencias en cada destino, con precio estimado. Pedí tu cotización a VIORA." };
export const dynamic = "force-dynamic";

export default async function ActividadesPage({ searchParams }: PageProps<"/actividades">) {
  const sp = await searchParams;
  const library = await loadLibrary();
  const id = typeof sp.destino === "string" ? sp.destino : "";
  const people = intParam(sp.pe, 1, 12, 2);
  const date = isoParam(sp.fecha);
  const d = library.find((x) => x.id === id) ?? null;
  const items = d ? estimateActivities(d).filter((a) => a.kind !== "shopping" || a.free) : [];
  const byCountry = new Map<string, typeof library>();
  for (const x of [...library].sort((a, b) => a.country.localeCompare(b.country, "es") || a.name.localeCompare(b.name, "es"))) byCountry.set(x.country, [...(byCountry.get(x.country) ?? []), x]);
  const ref = d ? referenceLink("civitatis", { q: d.name }) : null;

  return (
    <Container className="py-8 sm:py-10">
      <TravelTabs active="actividades" />
      <h1 className="mt-6 text-3xl font-semibold sm:text-4xl">Actividades y excursiones</h1>
      <p className="mt-2 max-w-2xl text-muted">Lo imperdible de cada destino, con precio estimado. Elegí lo que te guste y te lo reservamos.</p>
      <form action="/actividades" className="mt-6 grid gap-2 rounded-2xl border border-line bg-white p-4 shadow-lift sm:grid-cols-[1.6fr_1fr_0.7fr_auto] sm:items-end sm:p-5">
        <label className="block text-sm font-semibold text-navy">
          Destino
          <select name="destino" defaultValue={id} required className={`${inputClass} mt-1`}>
            <option value="">Elegí un destino…</option>
            {[...byCountry.entries()].map(([country, list]) => (
              <optgroup key={country} label={country}>
                {list.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold text-navy">
          Fecha aproximada <span className="font-normal text-muted">(opcional)</span>
          <input type="date" name="fecha" defaultValue={date} className={`${inputClass} mt-1`} />
        </label>
        <label className="block text-sm font-semibold text-navy">
          Personas
          <input type="number" name="pe" min={1} max={12} defaultValue={people} className={`${inputClass} mt-1`} />
        </label>
        <Button type="submit" className="min-h-11">
          <Search className="h-4 w-4" aria-hidden /> Ver actividades
        </Button>
      </form>

      {d && (
        <section id="resultados" className="mt-8 scroll-mt-24">
          <p className="text-sm font-bold uppercase tracking-wider text-coral-brand">Imperdibles</p>
          <h2 className="text-2xl font-semibold">
            Qué hacer en {d.name}, {d.country}
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-muted">{d.summary}</p>
          <ActivityPicker destination={`${d.name}, ${d.country}`} items={items} people={people} date={date} />
          <EstimateNote className="mt-4">Precios estimados de referencia por adulto, en dólares (entradas, guías o excursiones habituales). No son una cotización: dependen del proveedor, la fecha y la disponibilidad.</EstimateNote>
          {ref && (
            <a href={ref} target="_blank" rel="noopener noreferrer sponsored" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-navy underline">
              Ver más actividades de referencia <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          )}
        </section>
      )}
    </Container>
  );
}
