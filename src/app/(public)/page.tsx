import { ArrowRight, Compass, Globe2, HeartHandshake, Luggage, Map, Plane, Sparkles, Camera, Castle } from "lucide-react";
import { TRIP_STYLE_DEFS } from "@/core/catalog";
import { SmartImage } from "@/components/media/smart-image";
import { InstallBanner } from "@/components/pwa/pwa";
import { ACCENTS, ButtonLink, Card, Container, Logo, SectionTitle, cx } from "@/components/ui";
import { imagesFor } from "@/server/media-helpers";

export const dynamic = "force-dynamic";

const FEATURED = ["beach_relax", "eurotrip", "theme_parks", "honeymoon", "nature_adventure", "big_cities", "family", "discover"] as const;

const SERVICES = [
  { icon: Luggage, label: "Paquetes personalizados", accent: "purple" as const },
  { icon: Plane, label: "Vuelos", accent: "teal" as const },
  { icon: Castle, label: "Disney y parques", accent: "coral" as const },
  { icon: Camera, label: "Experiencias únicas", accent: "orange" as const },
  { icon: Globe2, label: "Europa y más", accent: "cyan" as const },
];

export default async function HomePage() {
  const styles = TRIP_STYLE_DEFS.filter((s) => (FEATURED as readonly string[]).includes(s.id));
  const [hero, ...tiles] = await Promise.all([imagesFor("Baía do Sancho", 1), ...styles.map((s) => imagesFor(s.imageQuery, 1))]);

  return (
    <>
      {/* Portada */}
      <section className="relative overflow-hidden">
        <Container className="grid items-center gap-10 py-10 sm:py-16 lg:grid-cols-[1.05fr_1fr]">
          <div className="fade-in">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-semibold text-teal-brand shadow-soft">
              <Sparkles className="h-4 w-4" aria-hidden /> Planificación de viajes a tu medida
            </p>
            <h1 className="text-4xl font-semibold leading-[1.08] sm:text-5xl lg:text-6xl">
              Contanos tu viaje soñado.
              <span className="block text-teal-brand">Lo diseñamos con vos.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              Aunque todavía no sepas adónde ir: respondé unas preguntas simples y recibí tres alternativas pensadas para vos, con itinerario, mapa y el acompañamiento de un asesor.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink href="/planificar" className="px-7 py-3 text-base">
                Empezar a planificar <ArrowRight className="h-4 w-4" aria-hidden />
              </ButtonLink>
              <ButtonLink href="#como-funciona" variant="ghost">
                ¿Cómo funciona?
              </ButtonLink>
            </div>
            <p className="mt-4 text-sm text-muted">Sin registrarte · Toma unos 5 minutos · Sin compromiso</p>
          </div>
          <div className="relative">
            <SmartImage
              image={hero[0]}
              alt="Playa de agua turquesa (Baía do Sancho, Fernando de Noronha)"
              eager
              className="aspect-[4/5] w-full rounded-[2rem] shadow-lift sm:aspect-[5/4] lg:aspect-[4/5]"
              fallback={
                <div className="flex h-full w-full items-center justify-center bg-white">
                  <Logo size={380} className="w-3/4 max-w-sm" />
                </div>
              }
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
                  fallback={<div className={cx("h-full w-full", ACCENTS[s.accent].bg)} />}
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

      {/* Transparencia */}
      <section className="py-16">
        <Container className="grid gap-6 md:grid-cols-2">
          <Card className="p-6">
            <h3 className="text-xl font-semibold">Recomendaciones honestas</h3>
            <p className="mt-2 text-muted">
              Cada propuesta explica por qué recomendamos un destino, qué lo favorece y qué lo complica. El clima que mostramos es el habitual de la época, no un pronóstico, y te indicamos qué hay que verificar antes de reservar.
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="text-xl font-semibold">Tus datos, cuidados</h3>
            <p className="mt-2 text-muted">
              No necesitás registrarte para empezar. Solo te pedimos tus datos de contacto cuando querés que un asesor te escriba, y únicamente con tu consentimiento.
            </p>
          </Card>
        </Container>
      </section>
      <InstallBanner />
    </>
  );
}
