import Link from "next/link";
import { ArrowRight, BedDouble, Camera, Castle, Compass, Globe2, HeartHandshake, Luggage, Map, MessageCircle, Plane, ShieldCheck, Sparkles, Star, Ticket, Wallet } from "lucide-react";
import { TRIP_STYLE_DEFS } from "@/core/catalog";
import { SmartImage } from "@/components/media/smart-image";
import { InstallBanner } from "@/components/pwa/pwa";
import { ACCENTS, ButtonLink, Card, Container, SectionTitle, cx } from "@/components/ui";
import { Postcard } from "@/components/postcard";
import { firstImage, imagesFor } from "@/server/media-helpers";
import { HERO_SPOTS } from "@/server/media-warmup";
import { EuropaGoVideo } from "@/components/home/europa-go";
import { whatsappLink } from "@/server/integrations/notify";
import { approvedTestimonials } from "@/server/services/leads";
import { loadLibrary } from "@/server/settings";
import { JsonLd, faqLd } from "@/components/seo/json-ld";
import { agency } from "@/server/settings";

export const dynamic = "force-dynamic";
export const metadata = { alternates: { canonical: "/" } };

const TOP_DESTINATIONS = ["orlando", "miami", "riviera-maya", "punta-cana", "madrid", "roma", "paris", "rio", "nueva-york", "barcelona", "bariloche", "florianopolis"];

const FEATURED = ["beach_relax", "eurotrip", "theme_parks", "honeymoon", "nature_adventure", "big_cities", "family", "discover"] as const;

const STYLE_KIND: Record<string, "beach" | "city" | "nature" | "themepark" | "island"> = {
  beach_relax: "beach",
  honeymoon: "island",
  nature_adventure: "nature",
  theme_parks: "themepark",
  family: "themepark",
  discover: "nature",
};

const SERVICES = [
  { icon: Luggage, label: "Paquetes personalizados", accent: "purple" as const },
  { icon: Plane, label: "Vuelos", accent: "teal" as const },
  { icon: Castle, label: "Disney y parques", accent: "coral" as const },
  { icon: Camera, label: "Experiencias únicas", accent: "orange" as const },
  { icon: Globe2, label: "Europa y más", accent: "cyan" as const },
];

const WHY = [
  { icon: HeartHandshake, title: "Un asesor real, de principio a fin", text: "Una persona de carne y hueso que te escucha, te recomienda y te responde por WhatsApp.", accent: "teal" as const },
  { icon: Wallet, title: "Precios claros", text: "Mirá precios estimados al instante y recibí la cotización real, sin letra chica ni sorpresas.", accent: "orange" as const },
  { icon: Map, title: "Todo en un solo lugar", text: "Vuelos, hoteles, traslados, excursiones e itinerario día por día. Nada queda al azar.", accent: "purple" as const },
  { icon: ShieldCheck, title: "Viajás tranquilo", text: "Verificamos requisitos y reservas antes de que pagues, y te acompañamos durante el viaje.", accent: "coral" as const },
];

const FAQ = [
  { q: "¿Tiene costo usar el planificador o pedir una cotización?", a: "No. Planificar tu viaje, ver precios estimados y pedir una cotización es gratis y sin compromiso." },
  { q: "¿Los precios que muestra la web son finales?", a: "Son estimados de referencia, calculados con margen para que no haya sorpresas. El precio final te lo confirma un asesor según la disponibilidad real de tus fechas." },
  { q: "¿Qué pasa después de pedir mi presupuesto?", a: "Un asesor de VIORA te escribe por WhatsApp o email con opciones concretas de vuelos, hoteles y actividades. Podés pedir cambios hasta que el viaje quede como lo soñás." },
  { q: "¿Puedo combinar un paquete armado con cosas a mi medida?", a: "¡Claro! Cualquier paquete se puede adaptar: sumar días, cambiar el hotel, agregar excursiones o un destino más." },
  { q: "¿Qué es Europa Go?", a: "Es la app que incluimos con los paquetes a Europa: planificación día por día, traductor, mapas sin internet, ubicaciones clave y planificador de presupuesto." },
];

export default async function HomePage() {
  const styles = TRIP_STYLE_DEFS.filter((s) => (FEATURED as readonly string[]).includes(s.id));
  // Fotos con espera corta: si no están en caché, se muestra la ilustración y se cargan para la próxima visita.
  const [heroOptions, tiles, testimonials] = await Promise.all([
    Promise.all(HERO_SPOTS.map((q) => imagesFor(q, 1, 1200))),
    Promise.all(styles.map(async (s) => [await firstImage(s.photoSpots, 1200)].filter((x) => x !== null))),
    approvedTestimonials(),
  ]);
  const library = await loadLibrary();
  const top = TOP_DESTINATIONS.map((id) => library.find((d) => d.id === id)).filter((d) => !!d);
  const wa = agency.whatsapp();
  const heroIndex = heroOptions.findIndex((h) => h.length > 0);
  const hero = heroIndex >= 0 ? heroOptions[heroIndex] : [];

  return (
    <>
      {/* Portada */}
      <section className="relative overflow-hidden">
        <Container className="grid items-center gap-10 py-10 sm:py-16 lg:grid-cols-[1.05fr_1fr]">
          <div className="fade-in">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-semibold text-teal-brand shadow-soft">
              <Sparkles className="h-4 w-4" aria-hidden /> Agencia de viajes con asesores reales
            </p>
            <h1 className="text-4xl font-semibold leading-[1.08] sm:text-5xl lg:text-6xl">
              Viajar puede ser complicado.
              <span className="block text-teal-brand">Con nosotros, es fácil.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              Vuelos, hoteles, excursiones y todo el itinerario, en un solo lugar. Vos elegís el sueño; nosotros nos ocupamos del resto, antes, durante y después del viaje.
            </p>
            {/* Dos caminos: a medida o paquete armado */}
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Link href="/planificar" className="group rounded-2xl bg-navy p-4 text-white shadow-lift transition-transform hover:-translate-y-0.5">
                <span className="text-2xl" aria-hidden>
                  ✨
                </span>
                <span className="mt-1 block font-display text-xl text-white">Planificá tu viaje</span>
                <span className="mt-0.5 block text-sm text-white/80">Unas preguntas y recibís 3 alternativas a tu medida.</span>
                <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold">
                  Empezar <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
              <Link href="/paquetes" className="group rounded-2xl border border-line bg-white p-4 shadow-soft transition-transform hover:-translate-y-0.5">
                <span className="text-2xl" aria-hidden>
                  🧳
                </span>
                <span className="mt-1 block font-display text-xl text-navy">Ver paquetes armados</span>
                <span className="mt-0.5 block text-sm text-muted">Disney, Europa, Caribe, Brasil y más, con precio.</span>
                <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-navy">
                  Ver paquetes <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            </div>
            <nav aria-label="Buscar" className="mt-3 grid grid-cols-3 gap-2">
              {[
                { href: "/vuelos", label: "Vuelos", icon: Plane },
                { href: "/hoteles", label: "Hoteles", icon: BedDouble },
                { href: "/actividades", label: "Actividades", icon: Ticket },
              ].map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-line bg-white px-2 text-sm font-semibold text-navy shadow-soft transition-transform hover:-translate-y-0.5">
                  <Icon className="h-4 w-4 text-teal-brand" aria-hidden /> {label}
                </Link>
              ))}
            </nav>
            <p className="mt-4 text-sm text-muted">Sin registrarte · Sin compromiso · Un asesor real te acompaña</p>
          </div>
          <div className="relative">
            <SmartImage
              image={hero[0]}
              alt={heroIndex >= 0 ? `Foto de ${HERO_SPOTS[heroIndex]}` : "Ilustración de una playa"}
              eager
              className="aspect-[4/5] w-full rounded-[2rem] shadow-lift sm:aspect-[5/4] lg:aspect-[4/5]"
              fallback={<Postcard name="Fernando de Noronha" kind="beach" className="h-full w-full" title={false} />}
            />
            <Card className="absolute -bottom-5 left-4 right-4 flex items-center gap-3 p-4 sm:left-auto sm:right-6 sm:w-72">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-coral-brand/12 text-coral-brand">
                <HeartHandshake className="h-5 w-5" aria-hidden />
              </div>
              <p className="text-sm text-navy">
                <strong>Un asesor real</strong> revisa tu propuesta y la convierte en un viaje concreto.
              </p>
            </Card>
          </div>
        </Container>
      </section>

      {/* Servicios */}
      <section aria-label="Servicios" className="mt-8 border-y border-line bg-white">
        <Container className="flex gap-6 overflow-x-auto py-5 scrollbar-none sm:justify-between">
          {SERVICES.map(({ icon: Icon, label, accent }) => (
            <div key={label} className="flex shrink-0 items-center gap-2.5 text-sm font-bold uppercase tracking-wide text-navy">
              <Icon className={cx("h-6 w-6", ACCENTS[accent].text)} aria-hidden />
              {label}
            </div>
          ))}
        </Container>
      </section>

      {/* Por qué VIORA */}
      <section className="pt-16">
        <Container>
          <SectionTitle eyebrow="Por qué VIORA" title="Te sacamos el estrés, te dejamos el viaje" accent="teal" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {WHY.map((w) => (
              <Card key={w.title} className="p-5">
                <span className={cx("flex h-11 w-11 items-center justify-center rounded-2xl", ACCENTS[w.accent].bg, "text-white")}>
                  <w.icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-3 text-lg font-semibold">{w.title}</h3>
                <p className="mt-1 text-sm text-muted">{w.text}</p>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* Tipos de viaje */}
      <section className="py-16">
        <Container>
          <SectionTitle eyebrow="Inspirate" title="¿Qué tipo de viaje te imaginás?" intro="Elegí un punto de partida. Después vamos a afinar juntos los detalles." accent="coral" />
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {styles.map((s, i) => (
              <a key={s.id} href={`/planificar?estilo=${s.id}`} className="group relative overflow-hidden rounded-2xl shadow-soft transition-shadow hover:shadow-lift">
                <SmartImage
                  image={tiles[i]?.[0]}
                  alt={s.label}
                  thumb
                  showCredit={false}
                  className="aspect-[4/5] w-full transition-transform duration-500 group-hover:scale-[1.03]"
                  fallback={<Postcard name={s.imageQuery} kind={STYLE_KIND[s.id] ?? "city"} className="h-full w-full" title={false} />}
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy/80 via-navy/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
                  <span className={cx("mb-2 block h-1 w-8 rounded-full", ACCENTS[s.accent].bg)} />
                  <p className="font-display text-lg leading-tight text-white sm:text-xl">{s.label}</p>
                  <p className="mt-1 hidden text-xs text-white/85 sm:block">{s.hint}</p>
                </div>
              </a>
            ))}
          </div>
        </Container>
      </section>

      {/* Cómo funciona */}
      <section id="como-funciona" className="bg-white py-16">
        <Container>
          <SectionTitle eyebrow="El proceso" title="De una idea a un viaje real" accent="teal" />
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { icon: Compass, title: "Contanos qué buscás", text: "Fechas, con quién viajás, qué te importa y qué lugares ya conocés. Preguntamos solo lo que cambia la recomendación.", accent: "teal" as const },
              { icon: Map, title: "Compará alternativas", text: "Te mostramos tres opciones con sus ventajas, el clima habitual de la época, la logística y un itinerario día por día.", accent: "orange" as const },
              { icon: HeartHandshake, title: "Lo hacemos realidad", text: "Un asesor de VIORA verifica vuelos, alojamientos y requisitos, y te prepara una propuesta personalizada.", accent: "purple" as const },
            ].map((step, i) => (
              <li key={step.title} className="relative rounded-2xl border border-line p-6">
                <span className="absolute right-5 top-4 font-display text-5xl text-sand-2">{i + 1}</span>
                <step.icon className={cx("h-8 w-8", ACCENTS[step.accent].text)} aria-hidden />
                <h3 className="mt-4 text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 text-muted">{step.text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex justify-center">
            <ButtonLink href="/planificar" className="px-7 py-3 text-base">
              Quiero diseñar mi viaje <ArrowRight className="h-4 w-4" aria-hidden />
            </ButtonLink>
          </div>
        </Container>
      </section>

      {/* Europa Go */}
      <section id="europa-go" className="bg-gradient-to-b from-sand to-white py-16">
        <Container>
          <SectionTitle
            eyebrow="Regalo para tu viaje a Europa"
            title={
              <>
                Comprá tu paquete a Europa y llevate la app <span className="text-teal-brand">Europa Go</span>
              </>
            }
            intro="Tu viaje entero en el bolsillo: te ayuda con todo, desde que salís hasta que volvés."
            accent="teal"
          />
          <div className="mt-10">
            <EuropaGoVideo />
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/paquetes?cat=europa" className="px-6 py-3">
              Ver paquetes a Europa <ArrowRight className="h-4 w-4" aria-hidden />
            </ButtonLink>
            <ButtonLink href="/planificar?estilo=eurotrip" variant="secondary" className="px-6 py-3">
              Armar mi Europa a medida
            </ButtonLink>
          </div>
        </Container>
      </section>

      {testimonials.length > 0 && (
        <section aria-labelledby="opiniones" className="py-16">
          <Container>
            <SectionTitle eyebrow="Lo que dicen nuestros viajeros" title={<span id="opiniones">Viajes reales, personas reales</span>} accent="orange" />
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {testimonials.slice(0, 6).map((t) => (
                <Card key={t.id} className="flex flex-col p-5">
                  <p className="flex gap-0.5 text-orange-brand" aria-label={`${t.rating} de 5 estrellas`}>
                    {Array.from({ length: t.rating }, (_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" aria-hidden />
                    ))}
                  </p>
                  <blockquote className="mt-3 flex-1 text-navy">«{t.text}»</blockquote>
                  <p className="mt-4 text-sm font-semibold text-navy">
                    {t.name}
                    {t.city && <span className="font-normal text-muted">, {t.city}</span>}
                  </p>
                  <p className="text-xs text-muted">{t.trip}</p>
                </Card>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* Destinos más buscados (enlaces a las guías: ayudan a Google y a la persona) */}
      {top.length > 0 && (
        <section className="py-16">
          <Container>
            <SectionTitle eyebrow="Guías de viaje" title="Destinos más buscados" intro="Mejor época, cuánto cuesta, qué hacer y dónde alojarse." accent="cyan" />
            <ul className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {top.map((d) => (
                <li key={d.id}>
                  <Link href={`/destinos/${d.id}`} className="flex min-h-14 items-center justify-between gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-navy shadow-soft hover:border-navy">
                    <span>
                      <span className="block font-semibold">Viajar a {d.name}</span>
                      <span className="block text-xs text-muted">{d.country}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-teal-brand" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-6 text-center">
              <Link href="/destinos" className="font-semibold text-navy underline">
                Ver todas las guías de destinos
              </Link>
            </div>
          </Container>
        </section>
      )}

      {/* Preguntas frecuentes */}
      <JsonLd data={faqLd(FAQ)} />
      <section className="bg-white py-16">
        <Container className="max-w-3xl">
          <SectionTitle eyebrow="Preguntas frecuentes" title="Todo claro antes de viajar" accent="purple" />
          <div className="mt-8 divide-y divide-line rounded-2xl border border-line">
            {FAQ.map((f) => (
              <details key={f.q} className="group p-4 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-navy">
                  {f.q}
                  <span className="text-xl text-teal-brand transition-transform group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-2 text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      {/* Cierre */}
      <section className="py-16">
        <Container>
          <div className="relative overflow-hidden rounded-[2rem] bg-navy px-6 py-12 text-center text-white sm:px-12">
            <p className="text-sm font-bold uppercase tracking-wider text-orange-brand">Tu próximo viaje empieza hoy</p>
            <h2 className="mx-auto mt-2 max-w-2xl text-3xl font-semibold text-white sm:text-4xl">Contanos tu idea y te armamos un presupuesto personalizado</h2>
            <p className="mx-auto mt-3 max-w-xl text-white/80">Sin compromiso. Un asesor de VIORA te escribe con opciones reales para tus fechas.</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/planificar" className="bg-coral-brand px-7 py-3 text-base hover:bg-coral-brand/90">
                Quiero mi viaje a medida <ArrowRight className="h-4 w-4" aria-hidden />
              </ButtonLink>
              {wa && (
                <a href={whatsappLink(wa, "¡Hola VIORA! Quiero que me ayuden a armar un viaje.")} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#1f9d55] px-6 py-3 font-semibold text-white hover:bg-[#1a8a4a]">
                  <MessageCircle className="h-4 w-4" aria-hidden /> Escribinos por WhatsApp
                </a>
              )}
            </div>
          </div>
        </Container>
      </section>
      <InstallBanner />
    </>
  );
}
