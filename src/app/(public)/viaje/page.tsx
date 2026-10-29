import Link from "next/link";
import { Check, Clock, Hotel, Minus, Plus, Waves } from "lucide-react";
import { MONTHS_ES } from "@/core/catalog";
import { mainStop } from "@/core/sanitize";
import { SmartImage } from "@/components/media/smart-image";
import { Confetti } from "@/components/proposal/confetti";
import { PersonaCard } from "@/components/proposal/persona-card";
import { ACCENT_ORDER, ACCENTS, Badge, Button, Card, CompatibilityRing, Container, Notice, cx } from "@/components/ui";
import { imagesFor } from "@/server/media-helpers";
import { coverPhoto } from "@/server/proposal-media";
import { currentProposal } from "@/server/services/client-flow";
import { chooseAlternativeAction } from "./actions";

export default async function ViajePage() {
  const data = await currentProposal();
  if (!data) return null;
  const p = data.proposal;
  const images = await Promise.all(
    p.alternatives.map((a) => {
      const main = mainStop(a);
      return main ? coverPhoto(main.name, main.country, a.imageQuery) : imagesFor(a.imageQuery, 1);
    }),
  );

  return (
    <Container className="py-10">
      {p.alternatives.length === 0 ? (
        <Notice tone="warning">
          No encontramos alternativas que encajen con todas tus preferencias en nuestra biblioteca. Un asesor puede investigar opciones a medida:{" "}
          <Link href="/viaje/solicitar" className="font-semibold underline">
            pedí asesoramiento
          </Link>
          .
        </Notice>
      ) : (
        <>
          <Confetti id={data.snapshotId} />
          {p.persona && <PersonaCard persona={p.persona} className="mb-10" />}
          <h2 className="text-2xl font-semibold">Tus tres alternativas</h2>
          <p className="mt-1 text-muted">Elegidas y ordenadas según lo que nos contaste. Cada una tiene un motivo distinto para estar acá.</p>
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            {p.alternatives.map((alt, i) => {
              const accent = ACCENTS[ACCENT_ORDER[i % ACCENT_ORDER.length]];
              const selected = p.selectedAlternativeId === alt.id;
              const nights = alt.stops.reduce((a, s) => a + s.nights, 0);
              return (
                <Card key={alt.id} className={cx("flex flex-col overflow-hidden", selected && "ring-2 ring-teal-brand")}>
                  <div className="relative">
                    <SmartImage image={images[i]?.[0]} alt={alt.title} eager={i === 0} className="aspect-[16/10] w-full" fallbackLabel={mainStop(alt)?.name ?? alt.title} kind={mainStop(alt)?.kind} />
                    <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                      {alt.labels.map((l) => (
                        <span key={l} className="rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-navy shadow-soft">
                          {l}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className={cx("text-xs font-bold uppercase tracking-wider", accent.text)}>Alternativa {String.fromCharCode(65 + i)}</p>
                        <h3 className="mt-1 text-xl font-semibold leading-tight">{alt.title}</h3>
                        <p className="mt-1 text-sm text-muted">
                          {alt.stops.map((s) => `${s.name} · ${s.nights}n`).join("  →  ")}
                        </p>
                      </div>
                      <div className="text-center">
                        <CompatibilityRing value={alt.compatibility} />
                        <p className="mt-1 text-[10px] font-semibold uppercase text-muted">compatibilidad</p>
                      </div>
                    </div>
                    <p className="mt-4 text-[15px] text-ink">{alt.mainReason}</p>
                    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-muted">
                        <Clock className="h-4 w-4" aria-hidden />
                        <span>{alt.travelHours ? `~${alt.travelHours} h de viaje` : "Tiempo de vuelo a confirmar"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted">
                        <Hotel className="h-4 w-4" aria-hidden />
                        <span>{alt.lodgingChanges === 0 ? "Un solo hotel" : `${alt.lodgingChanges} cambio(s) de hotel`}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted">
                        <Waves className="h-4 w-4" aria-hidden />
                        <span>Tranquilidad {alt.tranquility}</span>
                      </div>
                      <div className="text-muted">{nights} noches · {alt.experienceType}</div>
                    </dl>
                    <ul className="mt-4 space-y-1.5 text-sm">
                      {alt.pros.slice(0, 3).map((x) => (
                        <li key={x} className="flex gap-2">
                          <Plus className="mt-0.5 h-4 w-4 shrink-0 text-teal-brand" aria-hidden />
                          {x}
                        </li>
                      ))}
                      {alt.cons.slice(0, 2).map((x) => (
                        <li key={x} className="flex gap-2 text-muted">
                          <Minus className="mt-0.5 h-4 w-4 shrink-0 text-coral-brand" aria-hidden />
                          {x}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto pt-5">
                      <form action={chooseAlternativeAction}>
                        <input type="hidden" name="alternativeId" value={alt.id} />
                        <Button className="w-full" variant={selected ? "secondary" : "primary"}>
                          {selected ? (
                            <>
                              <Check className="h-4 w-4" aria-hidden /> Elegida · ver itinerario
                            </>
                          ) : (
                            "Elegir y ver itinerario"
                          )}
                        </Button>
                      </form>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/viaje/comparar" className="font-semibold text-navy underline underline-offset-4">
              Comparar en detalle
            </Link>
            <span className="text-muted">·</span>
            <Link href="/planificar" className="font-semibold text-navy underline underline-offset-4">
              Modificar mis respuestas
            </Link>
          </div>
        </>
      )}

      <section className="mt-12 grid gap-6 md:grid-cols-[1fr_1.2fr]">
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Lo que nos contaste</h2>
          <dl className="mt-3 space-y-2 text-sm">
            {p.preferences.map((x) => (
              <div key={x.label} className="flex justify-between gap-4 border-b border-line/60 pb-2 last:border-0">
                <dt className="text-muted">{x.label}</dt>
                <dd className="text-right font-semibold text-navy">{x.value}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <div className="space-y-3">
          <Notice>{p.disclaimer}</Notice>
          {p.exploratory && (
            <Notice tone="warning">
              {p.travelMonths?.length
                ? `Comparamos con el clima habitual de ${p.travelMonths.map((m) => MONTHS_ES[m - 1]).join(", ")}. Cuando confirmes fechas exactas, ajustamos la propuesta y verificamos disponibilidad.`
                : "Todavía no tenemos fechas: comparamos la mejor época de cada destino. Cuando definas fechas, recalculamos la propuesta con datos de esa temporada."}
            </Notice>
          )}
          <Badge tone="teal">Puntajes orientativos del sistema · no garantizan satisfacción</Badge>
        </div>
      </section>
    </Container>
  );
}
