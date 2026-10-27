import type { Metadata } from "next";
import { CloudSun, Minus, Plus } from "lucide-react";
import { mainStop } from "@/core/sanitize";
import { SmartImage } from "@/components/media/smart-image";
import { ACCENT_ORDER, ACCENTS, Badge, Card, CompatibilityRing, Container, Meter, Notice, cx } from "@/components/ui";
import { imagesFor } from "@/server/media-helpers";
import { currentProposal } from "@/server/services/client-flow";
import { chooseAlternativeAction } from "../actions";

export const metadata: Metadata = { title: "Comparar alternativas" };

export default async function CompararPage() {
  const data = await currentProposal();
  if (!data) return null;
  const alts = data.proposal.alternatives;
  const images = await Promise.all(alts.map((a) => imagesFor(a.imageQuery, 1)));
  if (!alts.length) return <Container className="py-10"><Notice tone="warning">No hay alternativas para comparar.</Notice></Container>;

  const rows: [string, (a: (typeof alts)[number]) => React.ReactNode][] = [
    ["Motivo principal", (a) => a.mainReason],
    ["Perfil ideal", (a) => a.idealTraveler],
    ["Tipo de experiencia", (a) => a.experienceType],
    ["Destinos y noches", (a) => a.stops.map((s) => `${s.name} (${s.nights})`).join(" → ")],
    ["Duración del viaje desde el origen", (a) => (a.travelHours ? `~${a.travelHours} h (estimación)` : "A confirmar")],
    ["Complejidad logística", (a) => a.logisticsComplexity],
    ["Cambios de alojamiento", (a) => (a.lodgingChanges === 0 ? "Ninguno" : a.lodgingChanges)],
    ["Nivel de tranquilidad", (a) => a.tranquility],
    ["Clima habitual", (a) => a.climateNote],
    ["Actividades principales", (a) => a.activities.slice(0, 5).join(" · ")],
    ["Observaciones", (a) => (a.warnings.length ? a.warnings.join(" ") : "Sin observaciones relevantes para la época.")],
  ];

  return (
    <Container className="py-10">
      <h2 className="text-2xl font-semibold">Comparación detallada</h2>
      <p className="mt-1 text-muted">Cada alternativa gana en algo distinto. Las etiquetas surgen de cómo puntúa cada una en los criterios que priorizaste.</p>

      {/* Desplazamiento horizontal en celular, columnas en escritorio */}
      <div className="mt-6 -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 scrollbar-none lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0">
        {alts.map((a, i) => {
          const accent = ACCENT_ORDER[i % ACCENT_ORDER.length];
          return (
            <Card key={a.id} className="w-[85vw] max-w-sm shrink-0 snap-center overflow-hidden lg:w-auto lg:max-w-none">
              <SmartImage image={images[i]?.[0]} alt={a.title} className="aspect-[16/9] w-full" fallbackLabel={mainStop(a)?.name ?? a.title} kind={mainStop(a)?.kind} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={cx("text-xs font-bold uppercase tracking-wider", ACCENTS[accent].text)}>Alternativa {String.fromCharCode(65 + i)}</p>
                    <h3 className="text-lg font-semibold leading-tight">{a.title}</h3>
                  </div>
                  <CompatibilityRing value={a.compatibility} size={56} />
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {a.labels.map((l) => (
                    <Badge key={l} tone={accent}>
                      {l}
                    </Badge>
                  ))}
                </div>
                <dl className="mt-5 space-y-4 text-sm">
                  {rows.map(([label, fn]) => (
                    <div key={label}>
                      <dt className="text-xs font-bold uppercase tracking-wide text-muted">{label}</dt>
                      <dd className="mt-1 text-ink">{fn(a)}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted">Ventajas</p>
                  <ul className="mt-1 space-y-1 text-sm">
                    {a.pros.map((x) => (
                      <li key={x} className="flex gap-2">
                        <Plus className="mt-0.5 h-4 w-4 shrink-0 text-teal-brand" aria-hidden />
                        {x}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted">Desventajas</p>
                  <ul className="mt-1 space-y-1 text-sm">
                    {a.cons.length ? (
                      a.cons.map((x) => (
                        <li key={x} className="flex gap-2 text-muted">
                          <Minus className="mt-0.5 h-4 w-4 shrink-0 text-coral-brand" aria-hidden />
                          {x}
                        </li>
                      ))
                    ) : (
                      <li className="text-muted">Sin desventajas relevantes detectadas.</li>
                    )}
                  </ul>
                </div>
                <details className="mt-5 rounded-xl bg-sand p-3">
                  <summary className="cursor-pointer text-sm font-semibold text-navy">Ver puntaje por criterio</summary>
                  <ul className="mt-3 space-y-3">
                    {a.criteria.map((c) => (
                      <li key={c.key}>
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-navy">{c.label}</span>
                          <span className="text-muted">{c.value.toFixed(1)}/10</span>
                        </div>
                        <Meter value={c.value} accent={accent} label={c.label} />
                        {c.factors.length > 0 && (
                          <ul className="mt-1 space-y-0.5 text-xs text-muted">
                            {c.factors.slice(0, 3).map((f) => (
                              <li key={f.text}>
                                {f.sign === "+" ? "▲" : "▼"} {f.text}
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                </details>
                {a.seasonal.length > 0 && (
                  <div className="mt-5 rounded-xl border border-line p-3">
                    <p className="flex items-center gap-2 text-sm font-semibold text-navy">
                      <CloudSun className="h-4 w-4" aria-hidden /> Si podés mover las fechas
                    </p>
                    <ul className="mt-2 space-y-2 text-xs">
                      {a.seasonal.map((w) => (
                        <li key={w.label}>
                          <span className="font-semibold capitalize text-navy">{w.label}</span> · clima {w.climateScore.toFixed(1)}/10
                          <p className="text-muted">{w.hypothesis}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <form action={chooseAlternativeAction} className="mt-5">
                  <input type="hidden" name="alternativeId" value={a.id} />
                  <button className="w-full rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy/90">{data.proposal.selectedAlternativeId === a.id ? "Ver itinerario" : "Elegir esta alternativa"}</button>
                </form>
              </div>
            </Card>
          );
        })}
      </div>
      <Notice className="mt-6">El puntaje es una recomendación orientativa generada por el sistema a partir de tus respuestas. No es una verdad objetiva ni una garantía de satisfacción.</Notice>
    </Container>
  );
}
