import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, MessageCircle, Sparkles, X } from "lucide-react";
import { PACKAGE_CATEGORIES } from "@/core/packages";
import { SmartImage } from "@/components/media/smart-image";
import { ButtonLink, Card, Container } from "@/components/ui";
import { QuoteForm } from "@/components/quote/quote-form";
import { JsonLd, breadcrumbs } from "@/components/seo/json-ld";
import { siteUrl } from "@/server/seo";
import { whatsappLink } from "@/server/integrations/notify";
import { packageCover, packageKind, packageNights, packagePrice } from "@/server/package-view";
import { destinationPhotos } from "@/server/proposal-media";
import { publishedPackage } from "@/server/services/packages";
import { agency, loadLibrary } from "@/server/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/paquetes/[slug]">): Promise<Metadata> {
  const p = await publishedPackage((await params).slug);
  if (!p) return { title: "Paquete", robots: { index: false } };
  const price = packagePrice(p);
  const description = `${p.summary}${price ? ` Desde ${price} ${p.priceNote}.` : ""} Paquete con salida desde Argentina: pedí tu cotización a VIORA TRAVEL.`.trim();
  return {
    title: `${p.title}${price ? ` desde ${price}` : ""}`,
    description: description.slice(0, 300),
    alternates: { canonical: `/paquetes/${p.slug}` },
    openGraph: { title: p.title, description: description.slice(0, 300), url: `/paquetes/${p.slug}`, locale: "es_AR", siteName: "VIORA TRAVEL", images: [p.imageUrl ? { url: p.imageUrl } : { url: "/opengraph-image", width: 1200, height: 630 }] },
  };
}

export default async function PaquetePage({ params }: PageProps<"/paquetes/[slug]">) {
  const p = await publishedPackage((await params).slug);
  if (!p) notFound();
  const library = await loadLibrary();
  const stops = p.stops.map((s) => ({ ...s, dest: library.find((d) => d.id === s.destinationId) })).filter((s) => s.dest);
  const [cover, photos] = await Promise.all([packageCover(p, library), Promise.all(stops.map((s) => destinationPhotos(s.dest!.name, s.dest!.country, 1)))]);
  const price = packagePrice(p);
  const cat = PACKAGE_CATEGORIES.find((c) => c.id === p.category);
  const url = `${agency.appUrl()}/paquetes/${p.slug}`;
  const wa = agency.whatsapp() ? whatsappLink(agency.whatsapp(), `¡Hola VIORA! Me interesa el paquete «${p.title}». ${url}`) : null;

  const base = siteUrl();
  const nights = stops.reduce((a, x) => a + x.nights, 0);
  const tripLd = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: p.title,
    description: p.summary,
    url: `${base}/paquetes/${p.slug}`,
    ...(cover ? { image: cover.url } : {}),
    touristType: cat?.label,
    itinerary: { "@type": "ItemList", itemListElement: stops.map((x, i) => ({ "@type": "ListItem", position: i + 1, item: { "@type": "TouristDestination", name: x.dest!.name, url: `${base}/destinos/${x.destinationId}` } })) },
    provider: { "@id": `${base}/#agencia` },
    ...(price && Number(p.priceFrom) > 0
      ? { offers: { "@type": "Offer", price: Number(p.priceFrom), priceCurrency: p.currency === "ARS" ? "ARS" : p.currency, availability: "https://schema.org/InStock", url: `${base}/paquetes/${p.slug}`, description: p.priceNote } }
      : {}),
    ...(nights ? { duration: `P${nights + 1}D` } : {}),
  };

  return (
    <Container className="py-8">
      <JsonLd data={[tripLd, breadcrumbs(base, [["Inicio", "/"], ["Paquetes", "/paquetes"], [p.title, `/paquetes/${p.slug}`]])]} />
      <Link href={cat ? `/paquetes?cat=${cat.id}` : "/paquetes"} className="text-sm font-semibold text-navy hover:underline">
        ← {cat ? `${cat.emoji} ${cat.label}` : "Paquetes"}
      </Link>
      <div className="mt-4 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <SmartImage image={cover} alt={p.title} eager className="aspect-[16/9] w-full rounded-3xl" fallbackLabel={p.title} kind={packageKind(p, library)} />
          <div>
            <h1 className="text-3xl font-semibold sm:text-4xl">{p.title}</h1>
            <p className="mt-2 text-lg text-muted">{p.summary}</p>
          </div>
          <section>
            <h2 className="text-xl font-semibold">🗺️ Recorrido · {packageNights(p)} noches</h2>
            <ol className="mt-4 space-y-4">
              {stops.map((s, i) => (
                <li key={s.destinationId}>
                  <Card className="grid overflow-hidden sm:grid-cols-[180px_1fr]">
                    <SmartImage image={photos[i]?.[0]} alt={s.dest!.name} thumb showCredit={false} className="aspect-[16/10] w-full sm:aspect-auto sm:h-full" fallbackLabel={s.dest!.name} kind={s.dest!.kind} />
                    <div className="p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted">
                        Parada {i + 1} · {s.nights} noches
                      </p>
                      <h3 className="mt-1 text-lg font-semibold">
                        <Link href={`/destinos/${s.destinationId}`} className="hover:underline">
                          {s.dest!.name}
                        </Link>
                      </h3>
                      <p className="mt-1 text-sm text-muted">{s.dest!.summary}</p>
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {s.dest!.highlights.slice(0, 4).map((h) => (
                          <li key={h.id} className="rounded-full bg-sand-2 px-2.5 py-1 text-xs font-semibold text-navy">
                            {h.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </Card>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="p-5">
            {price ? (
              <>
                <p className="text-sm text-muted">Desde</p>
                <p className="font-display text-4xl text-navy">{price}</p>
                <p className="text-sm text-muted">{p.priceNote}</p>
              </>
            ) : (
              <>
                <p className="font-display text-2xl text-navy">Consultá el precio</p>
                <p className="text-sm text-muted">Te pasamos la tarifa actualizada para tus fechas.</p>
              </>
            )}
            {p.departures && <p className="mt-3 rounded-xl bg-sand-2 px-3 py-2 text-sm text-navy">📅 {p.departures}</p>}
            <div className="mt-4 grid gap-2">
              {wa && (
                <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#1f9d55] px-5 py-2.5 font-semibold text-white hover:bg-[#1a8a4a]">
                  <MessageCircle className="h-4 w-4" aria-hidden /> Consultar por WhatsApp
                </a>
              )}
              <ButtonLink href="#cotizar">Pedir cotización</ButtonLink>
              <ButtonLink href="/planificar" variant="secondary">
                <Sparkles className="h-4 w-4" aria-hidden /> Quiero adaptarlo a mi medida
              </ButtonLink>
            </div>
            <p className="mt-3 text-xs text-muted">Precios sujetos a disponibilidad y a cambios de tarifas al momento de reservar. Un asesor te confirma todo antes de pagar.</p>
          </Card>
          {(p.includes.length > 0 || p.excludes.length > 0) && (
            <Card className="p-5">
              {p.includes.length > 0 && (
                <>
                  <h2 className="font-semibold">Incluye</h2>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {p.includes.map((x) => (
                      <li key={x} className="flex gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-brand" aria-hidden /> {x}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {p.excludes.length > 0 && (
                <>
                  <h2 className="mt-4 font-semibold">No incluye</h2>
                  <ul className="mt-2 space-y-1.5 text-sm text-muted">
                    {p.excludes.map((x) => (
                      <li key={x} className="flex gap-2">
                        <X className="mt-0.5 h-4 w-4 shrink-0 text-coral-brand" aria-hidden /> {x}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Card>
          )}
          {p.includes.length === 0 && <p className="px-1 text-sm text-muted">Tu asesor te detalla qué incluye (vuelos, hoteles, traslados y excursiones) según tus fechas.</p>}
        </aside>
      </div>
      <div id="cotizar" className="mt-10 scroll-mt-24">
        <QuoteForm
          kind="package"
          summary={`Paquete «${p.title}»${price ? ` (desde ${price})` : ""}`}
          details={{ package: p.slug, title: p.title }}
          title="Pedí este paquete para tus fechas"
          intro="Contanos cuándo querés viajar y con quién: un asesor te manda la tarifa actualizada y te ayuda a reservar."
          cta="Quiero este paquete"
        />
      </div>
    </Container>
  );
}
