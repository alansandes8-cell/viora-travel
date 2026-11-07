import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Plane, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { CABIN_LABEL, estimateFlight, type Cabin } from "@/core/fares";
import { Card, Container, cx } from "@/components/ui";
import { EstimateNote, fmtDay, intParam, isoParam, usd, usdRange } from "@/components/quote/estimate-bits";
import { FlightSearch } from "@/components/quote/flight-search";
import { QuoteForm } from "@/components/quote/quote-form";
import { TravelTabs } from "@/components/quote/travel-tabs";
import { airportByIata } from "@/server/places";

export const metadata: Metadata = {
  title: "Vuelos desde Argentina a todo el mundo: precios estimados al instante",
  description: "Buscá vuelos desde Buenos Aires y cualquier ciudad a Miami, Madrid, Cancún, Orlando, Río y el mundo. Mirá el precio estimado al instante y pedí la tarifa real a un asesor de VIORA.",
  alternates: { canonical: "/vuelos" },
};
export const dynamic = "force-dynamic";

const POPULAR = [
  ["MIA", "Miami"],
  ["MCO", "Orlando"],
  ["MAD", "Madrid"],
  ["FCO", "Roma"],
  ["CUN", "Cancún"],
  ["PUJ", "Punta Cana"],
  ["GIG", "Río de Janeiro"],
  ["JFK", "Nueva York"],
] as const;

const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

export default async function VuelosPage({ searchParams }: PageProps<"/vuelos">) {
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const from = airportByIata(typeof sp.de === "string" ? sp.de : "EZE");
  const to = typeof sp.a === "string" ? airportByIata(sp.a) : null;
  const depart = isoParam(sp.ida);
  const ret = isoParam(sp.vuelta);
  const adults = intParam(sp.ad, 1, 9, 2);
  const children = intParam(sp.ni, 0, 8, 0);
  const infants = Math.min(adults, intParam(sp.be, 0, 8, 0));
  const cabin: Cabin = typeof sp.cl === "string" && sp.cl in CABIN_LABEL ? (sp.cl as Cabin) : "economy";
  const ready = from && to && depart && depart >= today && from.iata !== to.iata && (!ret || ret >= depart);
  const est = ready ? estimateFlight({ from, to, depart, ret: ret || null, adults, children, infants, cabin }, today) : null;
  const defaultDepart = addDays(today, 60);
  const pick = (a: typeof from) => (a ? { iata: a.iata, name: a.name, city: a.city, country: a.country } : null);

  // Tres franjas dentro del rango estimado, al estilo de un buscador (sin inventar aerolíneas ni horarios).
  const bands = est
    ? (() => {
        const [lo, hi] = est.perAdult;
        const at = (f: number) => lo + (hi - lo) * f;
        return [
          { icon: Wallet, title: "La más económica", text: est.likelyStops ? "Con 1 o 2 escalas y horarios menos cómodos. Suele incluir solo equipaje de mano." : "Horarios menos cómodos; suele incluir solo equipaje de mano.", range: [lo, at(0.4)] as [number, number], accent: "teal" },
          { icon: Sparkles, title: "La recomendada", text: est.likelyStops ? "Una escala, buena duración total y valija despachada." : "Buen horario y valija despachada.", range: [at(0.3), at(0.75)] as [number, number], accent: "orange", best: true },
          { icon: ShieldCheck, title: "La más flexible", text: "Tarifa con cambios y valija incluidos, o la ruta más corta disponible.", range: [at(0.65), hi] as [number, number], accent: "purple" },
        ];
      })()
    : [];
  const summary = est && from && to ? `${from.city} (${from.iata}) → ${to.city} (${to.iata}) · ${fmtDay(depart)}${ret ? ` al ${fmtDay(ret)}` : " (solo ida)"} · ${adults + children + infants} pasajeros · ${CABIN_LABEL[cabin]}` : "";

  return (
    <Container className="py-8 sm:py-10">
      <TravelTabs active="vuelos" />
      <h1 className="mt-6 text-3xl font-semibold sm:text-4xl">Vuelos a donde quieras</h1>
      <p className="mt-2 max-w-2xl text-muted">Elegí origen, destino y fechas: te mostramos un precio estimado al instante y un asesor te consigue la mejor tarifa real.</p>
      <div className="mt-6">
        <FlightSearch
          key={`${from?.iata}-${to?.iata}-${depart}-${ret}`}
          initial={{ from: pick(from), to: pick(to), depart: depart || defaultDepart, ret: ret || (depart ? "" : addDays(defaultDepart, 14)), oneWay: !!depart && !ret, adults, children, infants, cabin }}
        />
      </div>

      {!est && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold">Destinos más buscados desde Buenos Aires</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {POPULAR.map(([code, city]) => (
              <Link key={code} href={`/vuelos?de=EZE&a=${code}&ida=${defaultDepart}&vuelta=${addDays(defaultDepart, 14)}&ad=2#resultados`} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-semibold text-navy shadow-soft hover:border-navy">
                <Plane className="h-4 w-4 text-teal-brand" aria-hidden /> {city}
              </Link>
            ))}
          </div>
        </section>
      )}

      {est && from && to && (
        <section id="resultados" className="mt-8 scroll-mt-24" aria-label="Resultados estimados">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-coral-brand">Precio estimado</p>
              <h2 className="text-2xl font-semibold">
                {from.city} → {to.city}
              </h2>
              <p className="text-sm text-muted">{summary}</p>
            </div>
            <p className="flex items-center gap-1.5 text-sm text-muted">
              <Clock className="h-4 w-4" aria-hidden /> ≈ {est.hours} h de viaje{est.likelyStops ? " (con una escala típica)" : ""} · {est.km.toLocaleString("es-AR")} km
            </p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {bands.map((b) => (
              <Card key={b.title} className={cx("relative p-5", b.best && "ring-2 ring-orange-brand")}>
                {b.best && <span className="absolute -top-3 left-4 rounded-full bg-orange-brand px-2.5 py-0.5 text-xs font-bold text-white">Más elegida</span>}
                <b.icon className="h-6 w-6 text-navy" aria-hidden />
                <p className="mt-2 font-display text-lg text-navy">{b.title}</p>
                <p className="mt-1 text-sm text-muted">{b.text}</p>
                <p className="mt-3 text-2xl font-bold text-navy">{usdRange(b.range)}</p>
                <p className="text-xs text-muted">por adulto, {ret ? "ida y vuelta" : "solo ida"}, con tasas</p>
              </Card>
            ))}
          </div>
          <Card className="mt-3 flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm text-navy">
              <strong>Total estimado para {est.passengers} {est.passengers === 1 ? "pasajero" : "pasajeros"}:</strong> {usd(est.total[0])} a {usd(est.total[1])}
            </p>
            {est.notes.length > 0 && <p className="text-sm text-coral-brand">{est.notes.join(" ")}</p>}
          </Card>
          <EstimateNote className="mt-3" />
          <div className="mt-6">
            <QuoteForm
              kind="flight"
              summary={summary}
              details={{ from: from.iata, to: to.iata, depart, ret: ret || null, adults, children, infants, cabin, estimatePerAdult: est.perAdult, estimateTotal: est.total }}
              title="Te conseguimos la tarifa real"
              intro="Un asesor revisa todas las aerolíneas para tus fechas y te escribe con las mejores opciones (y te avisa si moviendo un día pagás menos)."
            />
          </div>
        </section>
      )}
    </Container>
  );
}
