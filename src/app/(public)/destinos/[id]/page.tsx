import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BedDouble, CalendarDays, ChevronRight, Clock, ExternalLink, MapPin, Plane, Ticket, Utensils, Users, AlertTriangle } from "lucide-react";
import { RAIN_LABEL, bestMonths, guideCost, guideFaq, guideYear, listEs, monthTable } from "@/core/destination-guide";
import { SUPER_REGION, SUPER_REGION_LABEL } from "@/core/library";
import { SmartImage } from "@/components/media/smart-image";
import { QuoteForm } from "@/components/quote/quote-form";
import { EstimateNote } from "@/components/quote/estimate-bits";
import { JsonLd, breadcrumbs, faqLd } from "@/components/seo/json-ld";
import { ButtonLink, Card, Container, cx } from "@/components/ui";
import { airportByIata } from "@/server/places";
import { destinationPhotos } from "@/server/proposal-media";
import { siteUrl } from "@/server/seo";
import { publishedPackages } from "@/server/services/packages";
import { loadLibrary } from "@/server/settings";

export const dynamic = "force-dynamic";

async function find(id: string) {
  if (!/^[a-z0-9-]{1,60}$/.test(id)) return null;
  return (await loadLibrary()).find((d) => d.id === id) ?? null;
}

export async function generateMetadata({ params }: PageProps<"/destinos/[id]">): Promise<Metadata> {
  const d = await find((await params).id);
  if (!d) return { title: "Destino no encontrado", robots: { index: false } };
  const best = bestMonths(monthTable(d)).map((r) => r.name);
  const title = `Viajar a ${d.name} desde Argentina: mejor época, precios y qué hacer (${guideYear()})`;
  const description = `Guía de ${d.name}, ${d.country}: mejor época (${listEs(best)}), cuánto cuesta el viaje con vuelo y hotel, qué hacer, dónde alojarse y qué comer. Pedí tu presupuesto a VIORA TRAVEL.`;
  const photo = (await destinationPhotos(d.name, d.country, 1))[0];
  return {
    title: { absolute: `${title} · VIORA` },
    description,
    alternates: { canonical: `/destinos/${d.id}` },
    openGraph: { title, description, type: "article", url: `/destinos/${d.id}`, locale: "es_AR", siteName: "VIORA TRAVEL", images: [photo ? { url: photo.url, alt: d.name } : { url: "/opengraph-image", width: 1200, height: 630 }] },
  };
}

const scoreClass = (s: number) => (s >= 8 ? "bg-teal-brand text-white" : s >= 6 ? "bg-teal-brand/25 text-navy" : s >= 4 ? "bg-orange-brand/25 text-navy" : "bg-coral-brand/20 text-navy");
const money = (n: number) => Math.round(n).toLocaleString("es-AR");

export default async function DestinoPage({ params }: PageProps<"/destinos/[id]">) {
  const d = await find((await params).id);
  if (!d) notFound();
  const [library, packages, photos] = await Promise.all([loadLibrary(), publishedPackages(), destinationPhotos(d.name, d.country, 1)]);
  const ap = d.airports.map((a) => airportByIata(a)).find(Boolean) ?? null;
  const rows = monthTable(d);
  const best = bestMonths(rows);
  const cost = guideCost(d, ap);
  const faq = guideFaq(d, cost, rows);
  const region = SUPER_REGION_LABEL[SUPER_REGION[d.cluster]] ?? "";
  const related = packages.filter((p) => p.stops.some((s) => s.destinationId === d.id)).slice(0, 3);
  const nearby = library.filter((x) => x.id !== d.id && x.cluster === d.cluster).slice(0, 6);
  const notes = (d.risks ?? []).filter((r) => r.level !== "low");
  const base = siteUrl();
  const cur = cost.daily.currency === "EUR" ? "€" : "US$";

  return (
    <article>
      <JsonLd
        data={[
          breadcrumbs(base, [
            ["Inicio", "/"],
            ["Destinos", "/destinos"],
            [d.name, `/destinos/${d.id}`],
          ]),
          {
            "@context": "https://schema.org",
            "@type": "TouristDestination",
            name: d.name,
            description: d.summary,
            url: `${base}/destinos/${d.id}`,
            geo: { "@type": "GeoCoordinates", latitude: d.lat, longitude: d.lng },
            containedInPlace: { "@type": "Country", name: d.country },
            touristType: d.idealFor,
            ...(photos[0] ? { image: photos[0].url } : {}),
            includesAttraction: d.highlights.slice(0, 8).map((h) => ({ "@type": "TouristAttraction", name: h.name })),
          },
          faqLd(faq),
        ]}
      />
      <Container className="pt-6">
        <nav aria-label="Ruta de navegación" className="flex flex-wrap items-center gap-1 text-sm text-muted">
          <Link href="/" className="hover:text-navy">
            Inicio
          </Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          <Link href="/destinos" className="hover:text-navy">
            Destinos
          </Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          <span className="text-navy">{d.name}</span>
        </nav>
      </Container>

      <Container className="grid gap-8 py-6 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-coral-brand">
            {d.country}
            {region && region !== d.country ? ` · ${region}` : ""}
          </p>
          <h1 className="mt-1 text-4xl font-semibold leading-tight sm:text-5xl">Viajar a {d.name}</h1>
          <p className="mt-3 text-lg text-muted">{d.summary}</p>
          <p className="mt-2 text-navy">
            <strong>Ideal para:</strong> {d.idealFor}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <ButtonLink href="#presupuesto" className="px-6 py-3">
              Quiero mi presupuesto
            </ButtonLink>
            <ButtonLink href={`/planificar`} variant="secondary" className="px-6 py-3">
              Armar mi viaje a medida
            </ButtonLink>
          </div>
        </div>
        <SmartImage image={photos[0]} alt={`${d.name}, ${d.country}`} eager className="aspect-[4/3] w-full rounded-[2rem] shadow-lift" fallbackLabel={d.name} kind={d.kind} />
      </Container>

      <Container>
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { icon: CalendarDays, label: "Mejor época", value: listEs(best.map((r) => r.name)) },
            { icon: Clock, label: "Días recomendados", value: `${d.nights.ideal} noches (${d.nights.min}–${d.nights.max})` },
            { icon: Plane, label: "Vuelo desde Buenos Aires", value: cost.flight ? `US$ ${money(cost.flight[0])} – ${money(cost.flight[1])}` : "Consultanos" },
            { icon: Users, label: "En familia", value: d.familyFit >= 3 ? "Muy recomendable" : d.familyFit === 2 ? "Bien" : "Mejor para adultos" },
          ].map((f) => (
            <Card key={f.label} className="p-4">
              <dt className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">
                <f.icon className="h-4 w-4 text-teal-brand" aria-hidden /> {f.label}
              </dt>
              <dd className="mt-1 font-semibold text-navy">{f.value}</dd>
            </Card>
          ))}
        </dl>
      </Container>

      <Container className="mt-12">
        <h2 className="text-2xl font-semibold sm:text-3xl">¿Cuándo conviene viajar a {d.name}?</h2>
        <p className="mt-2 max-w-3xl text-muted">
          Según el clima habitual, los mejores meses suelen ser <strong className="text-navy">{listEs(best.map((r) => r.name))}</strong>.
          {(d.highSeason ?? []).length > 0 && <> La temporada alta (más gente y precios más altos) es en {listEs((d.highSeason ?? []).map((m) => rows[m - 1].name))}.</>} Es una referencia histórica, no un pronóstico.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {rows.map((r) => (
            <div key={r.month} className={cx("rounded-xl p-3 text-sm", scoreClass(r.score))}>
              <p className="font-semibold capitalize">{r.name}</p>
              {r.hi !== null && <p>{r.hi}° máx.</p>}
              {r.rain !== null && <p className="text-xs opacity-90">{RAIN_LABEL[r.rain]}</p>}
              {r.sea !== null && <p className="text-xs opacity-90">Mar {r.sea}°</p>}
              {r.high && <p className="mt-1 text-[11px] font-bold uppercase">Temporada alta</p>}
            </div>
          ))}
        </div>
      </Container>

      <Container className="mt-12">
        <h2 className="text-2xl font-semibold sm:text-3xl">¿Cuánto cuesta viajar a {d.name}?</h2>
        <p className="mt-2 max-w-3xl text-muted">Valores de referencia saliendo de Buenos Aires, en temporada media y comprando con unos dos meses de anticipación.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {cost.flight && (
            <Card className="p-5">
              <Plane className="h-6 w-6 text-navy" aria-hidden />
              <p className="mt-2 font-semibold text-navy">Vuelo ida y vuelta</p>
              <p className="mt-1 text-2xl font-bold text-navy">
                US$ {money(cost.flight[0])} – {money(cost.flight[1])}
              </p>
              <p className="text-xs text-muted">por persona, clase turista{cost.flightHours ? ` · ≈ ${cost.flightHours} h de viaje` : ""}</p>
              {d.airports[0] && (
                <Link href={`/vuelos?de=EZE&a=${d.airports[0]}`} className="mt-3 inline-block text-sm font-semibold text-navy underline">
                  Calcular con mis fechas
                </Link>
              )}
            </Card>
          )}
          <Card className="p-5">
            <BedDouble className="h-6 w-6 text-navy" aria-hidden />
            <p className="mt-2 font-semibold text-navy">Hotel por noche</p>
            <p className="mt-1 text-2xl font-bold text-navy">
              US$ {money(cost.hotel3[0])} – {money(cost.hotel4[1])}
            </p>
            <p className="text-xs text-muted">habitación doble, de 3★ a 4★</p>
            <Link href={`/hoteles?ciudad=${encodeURIComponent(d.name)}&pais=${encodeURIComponent(d.country)}`} className="mt-3 inline-block text-sm font-semibold text-navy underline">
              Ver hoteles y zonas
            </Link>
          </Card>
          <Card className="p-5">
            <Utensils className="h-6 w-6 text-navy" aria-hidden />
            <p className="mt-2 font-semibold text-navy">Gastos por día</p>
            <p className="mt-1 text-2xl font-bold text-navy">
              {cur} {cost.daily.low} – {cost.daily.high}
            </p>
            <p className="text-xs text-muted">por persona: comidas, transporte local y entradas</p>
          </Card>
        </div>
        {cost.examplePerPerson && (
          <p className="mt-3 rounded-2xl bg-navy px-4 py-3 text-white">
            <strong>Ejemplo:</strong> {cost.nights} noches en pareja, vuelo + hotel 4★ ≈ <strong>US$ {money(cost.examplePerPerson[0])} – {money(cost.examplePerPerson[1])}</strong> por persona.
          </p>
        )}
        <EstimateNote className="mt-3" />
      </Container>

      {d.highlights.length > 0 && (
        <Container className="mt-12">
          <h2 className="text-2xl font-semibold sm:text-3xl">Qué hacer en {d.name}</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {d.highlights.map((h) => (
              <li key={h.id} className="flex gap-3 rounded-2xl border border-line bg-white p-4">
                <Ticket className="mt-0.5 h-5 w-5 shrink-0 text-teal-brand" aria-hidden />
                <div>
                  <h3 className="font-semibold text-navy">{h.name}</h3>
                  <p className="text-sm text-muted">
                    {h.hours} h{h.booking === "required" ? " · conviene reservar antes" : ""}
                    {h.kidsOk ? " · apto chicos" : ""}
                    {h.note ? ` · ${h.note}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <Link href={`/actividades?destino=${d.id}`} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-navy underline">
            Ver precios de excursiones y actividades
          </Link>
        </Container>
      )}

      <Container className="mt-12 grid gap-6 md:grid-cols-2">
        {d.lodgingZones.length > 0 && (
          <section>
            <h2 className="text-2xl font-semibold">Dónde alojarse en {d.name}</h2>
            <ul className="mt-3 space-y-2">
              {d.lodgingZones.map((z) => (
                <li key={z.name} className="flex gap-2">
                  <MapPin className="mt-1 h-4 w-4 shrink-0 text-teal-brand" aria-hidden />
                  <span>
                    <strong className="text-navy">{z.name}:</strong> <span className="text-muted">{z.profile}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {d.food.length > 0 && (
          <section>
            <h2 className="text-2xl font-semibold">Qué comer</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {d.food.map((f) => (
                <li key={f} className="rounded-full bg-sand-2 px-3 py-1.5 text-sm text-navy">
                  {f}
                </li>
              ))}
            </ul>
          </section>
        )}
      </Container>

      {notes.length > 0 && (
        <Container className="mt-12">
          <h2 className="text-2xl font-semibold">A tener en cuenta</h2>
          <ul className="mt-3 space-y-2">
            {notes.map((r) => (
              <li key={r.note} className="flex gap-2 text-muted">
                <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-orange-brand" aria-hidden /> {r.note}
              </li>
            ))}
          </ul>
        </Container>
      )}

      {related.length > 0 && (
        <Container className="mt-12">
          <h2 className="text-2xl font-semibold">Paquetes que incluyen {d.name}</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-3">
            {related.map((p) => (
              <li key={p.id}>
                <Link href={`/paquetes/${p.slug}`} className="block rounded-2xl border border-line bg-white p-4 font-semibold text-navy hover:shadow-lift">
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      )}

      <Container className="mt-12">
        <h2 className="text-2xl font-semibold sm:text-3xl">Preguntas frecuentes sobre {d.name}</h2>
        <div className="mt-4 divide-y divide-line rounded-2xl border border-line bg-white">
          {faq.map((f) => (
            <details key={f.q} className="group p-4" open={false}>
              <summary className="cursor-pointer list-none font-semibold text-navy">
                <h3 className="inline font-sans text-base">{f.q}</h3>
              </summary>
              <p className="mt-2 text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </Container>

      <Container className="mt-12">
        <div id="presupuesto" className="scroll-mt-24">
        <QuoteForm
          kind="custom"
          summary={`Quiere viajar a ${d.name} (${d.country})`}
          details={{ destination: d.id, from: "guía de destino" }}
          title={`¿Te armamos tu viaje a ${d.name}?`}
          intro="Contanos fechas y con quién viajás en el mensaje: un asesor de VIORA te manda vuelos, hotel y excursiones con precio real. Sin compromiso."
          cta="Quiero mi presupuesto"
        />
        </div>
      </Container>

      {(nearby.length > 0 || d.tourismUrl) && (
        <Container className="mt-12">
          {nearby.length > 0 && (
            <>
              <h2 className="text-xl font-semibold">Destinos cerca de {d.name}</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {nearby.map((x) => (
                  <li key={x.id}>
                    <Link href={`/destinos/${x.id}`} className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-4 text-sm font-semibold text-navy hover:border-navy">
                      {x.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
          {d.tourismUrl && (
            <a href={d.tourismUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm text-muted underline">
              Sitio oficial de turismo <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          )}
        </Container>
      )}
    </article>
  );
}
