import type { Metadata } from "next";
import Link from "next/link";
import { BedDouble, ExternalLink, MapPin, Star } from "lucide-react";
import { costLevelFor, estimateHotel } from "@/core/fares";
import { normalize } from "@/core/text";
import { Card, Container, cx } from "@/components/ui";
import { EstimateNote, fmtDay, intParam, isoParam, usdRange } from "@/components/quote/estimate-bits";
import { HotelSearch } from "@/components/quote/hotel-search";
import { QuoteForm } from "@/components/quote/quote-form";
import { TravelTabs } from "@/components/quote/travel-tabs";
import { referenceLink } from "@/server/reference-links";
import { loadLibrary } from "@/server/settings";

export const metadata: Metadata = {
  title: "Hoteles en todo el mundo: cuánto cuesta alojarse y mejores zonas",
  description: "Precio estimado por noche de hoteles 3, 4 y 5 estrellas en cada destino y las mejores zonas para alojarse. Pedí tu cotización a VIORA TRAVEL.",
  alternates: { canonical: "/hoteles" },
};
export const dynamic = "force-dynamic";

const POPULAR = ["Miami", "Orlando", "Madrid", "Roma", "París", "Cancún", "Punta Cana", "Río de Janeiro"];
const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

export default async function HotelesPage({ searchParams }: PageProps<"/hoteles">) {
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const city = typeof sp.ciudad === "string" ? sp.ciudad.slice(0, 80) : "";
  const country = typeof sp.pais === "string" ? sp.pais.slice(0, 80) : "";
  const checkin = isoParam(sp.entrada);
  const checkout = isoParam(sp.salida);
  const guests = intParam(sp.hu, 1, 10, 2);
  const stars = [3, 4, 5].includes(Number(sp.est)) ? Number(sp.est) : 4;
  const library = await loadLibrary();
  const ready = city && checkin && checkout && checkin >= today && checkout > checkin;
  const { level, destination } = ready ? costLevelFor(city, country, library, normalize) : { level: 3, destination: null };
  const options = ready ? [3, 4, 5].map((s) => ({ stars: s, est: estimateHotel(level, checkin, checkout, guests, s) })) : [];
  const chosen = options.find((o) => o.stars === stars)?.est;
  const summary = chosen ? `Hotel en ${city}${country && country !== city ? ` (${country})` : ""} · ${fmtDay(checkin)} al ${fmtDay(checkout)} · ${chosen.nights} noches · ${guests} personas · ${stars}★` : "";
  const ref = ready ? referenceLink("booking", { q: city, checkin, checkout, adults: guests }) : null;
  const defaultIn = addDays(today, 60);

  return (
    <Container className="py-8 sm:py-10">
      <TravelTabs active="hoteles" />
      <h1 className="mt-6 text-3xl font-semibold sm:text-4xl">Hoteles en todo el mundo</h1>
      <p className="mt-2 max-w-2xl text-muted">Te mostramos cuánto suele costar alojarte según la categoría y te recomendamos las mejores zonas. Después un asesor te cotiza hoteles reales.</p>
      <div className="mt-6">
        <HotelSearch key={`${city}-${checkin}-${checkout}`} initial={{ city: city ? { label: city, country } : null, checkin: checkin || defaultIn, checkout: checkout || addDays(defaultIn, 7), guests, stars }} />
      </div>

      {!ready && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold">Destinos populares</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {POPULAR.map((c) => {
              const d = library.find((x) => normalize(x.name) === normalize(c));
              return (
                <Link key={c} href={`/hoteles?ciudad=${encodeURIComponent(c)}&pais=${encodeURIComponent(d?.country ?? "")}&entrada=${defaultIn}&salida=${addDays(defaultIn, 7)}&hu=2&est=4#resultados`} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-semibold text-navy shadow-soft hover:border-navy">
                  <BedDouble className="h-4 w-4 text-teal-brand" aria-hidden /> {c}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {chosen && (
        <section id="resultados" className="mt-8 scroll-mt-24" aria-label="Resultados estimados">
          <p className="text-sm font-bold uppercase tracking-wider text-coral-brand">Precio estimado</p>
          <h2 className="text-2xl font-semibold">Alojamiento en {city}</h2>
          <p className="text-sm text-muted">{summary}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {options.map(({ stars: s, est }) => (
              <Link key={s} href={`/hoteles?ciudad=${encodeURIComponent(city)}&pais=${encodeURIComponent(country)}&entrada=${checkin}&salida=${checkout}&hu=${guests}&est=${s}#resultados`} scroll={false}>
                <Card className={cx("h-full p-5 transition-shadow hover:shadow-lift", s === stars && "ring-2 ring-orange-brand")}>
                  <p className="flex items-center gap-0.5 text-orange-brand" aria-label={`${s} estrellas`}>
                    {Array.from({ length: s }, (_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" aria-hidden />
                    ))}
                  </p>
                  <p className="mt-2 font-display text-lg text-navy">{s === 3 ? "Cómodo y bien ubicado" : s === 4 ? "Superior" : "Lujo"}</p>
                  <p className="mt-3 text-2xl font-bold text-navy">{usdRange(est.perNight)}</p>
                  <p className="text-xs text-muted">
                    por noche · {est.rooms} {est.rooms === 1 ? "habitación" : "habitaciones"}
                  </p>
                  <p className="mt-2 text-sm text-navy">
                    <strong>Total {est.nights} noches:</strong> {usdRange(est.total)}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
          {chosen.notes.length > 0 && <p className="mt-3 text-sm text-coral-brand">{chosen.notes.join(" ")}</p>}
          {destination && destination.lodgingZones.length > 0 && (
            <Card className="mt-4 p-5">
              <p className="font-display text-lg text-navy">Dónde conviene alojarse en {destination.name}</p>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {destination.lodgingZones.map((z) => (
                  <li key={z.name} className="flex gap-2 text-sm">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-teal-brand" aria-hidden />
                    <span>
                      <b className="text-navy">{z.name}:</b> <span className="text-muted">{z.profile}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <EstimateNote className="mt-3">Precios estimados de referencia en dólares, por habitación doble con impuestos, según la categoría y el costo habitual del destino. No son una cotización: la tarifa real depende de la disponibilidad y del hotel elegido.</EstimateNote>
          {ref && (
            <a href={ref} target="_blank" rel="noopener noreferrer sponsored" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-navy underline">
              Ver hoteles de referencia <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          )}
          <div className="mt-6">
            <QuoteForm
              kind="hotel"
              summary={summary}
              details={{ city, country, checkin, checkout, guests, stars, estimatePerNight: chosen.perNight, estimateTotal: chosen.total }}
              title="Te cotizamos hoteles reales"
              intro="Un asesor te manda 2 o 3 hoteles concretos en las mejores zonas, con fotos y precio final. Si querés, sumamos vuelos y traslados."
            />
          </div>
        </section>
      )}
    </Container>
  );
}
