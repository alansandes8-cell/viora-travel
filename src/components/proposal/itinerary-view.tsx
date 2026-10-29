import { BedDouble, Bus, CalendarDays, CloudRain, ExternalLink, Footprints, MapPin, Plane, Ship, Ticket, TrainFront, Utensils } from "lucide-react";
import type { ClientProposal } from "@/core/sanitize";
import type { MediaItem } from "@/server/integrations/media";
import { SmartImage } from "@/components/media/smart-image";
import { ACCENT_ORDER, ACCENTS, Badge, Card, Notice, cx } from "@/components/ui";
import { RouteMap } from "./route-map";
import { RouteSketch } from "./route-sketch";

const MODE_ICON: Record<string, typeof Plane> = { avión: Plane, tren: TrainFront, bus: Bus, ferry: Ship };

function fmtDate(iso?: string) {
  if (!iso) return null;
  return new Date(iso + "T12:00:00Z").toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

const EFFORT = ["", "Exigencia baja", "Exigencia media", "Exigencia alta"];

const SYMBOL = { USD: "US$", EUR: "€" } as const;

/** Costo aproximado por persona: vuelos + alojamiento + traslados. Referencia de mercado, no cotización. */
function TripEstimateCard({ e }: { e: NonNullable<ClientProposal["tripEstimate"]> }) {
  const fmt = (r: [number, number]) => `US$ ${r[0].toLocaleString("es-AR")} – ${r[1].toLocaleString("es-AR")}`;
  const rows: [string, [number, number]][] = [
    ...(e.includesFlights ? ([["✈️ Vuelos ida y vuelta (clase turista)", e.flights]] as [string, [number, number]][]) : []),
    [`🏨 Alojamiento (${e.nights} noches)`, e.lodging],
    ...(e.transfers[1] > 0 ? ([["🚆 Traslados entre ciudades", e.transfers]] as [string, [number, number]][]) : []),
  ];
  return (
    <section className="avoid-break" data-daily-spend>
      <Card className="p-5">
        <h2 className="text-lg font-semibold">💼 Costo aproximado del viaje</h2>
        <p className="mt-1 text-sm text-muted">Por persona, {e.includesFlights ? "con vuelos desde Argentina, " : ""}alojamiento y traslados, según el nivel de viaje que elegiste. Los gastos del día a día van aparte (abajo).</p>
        <ul className="mt-3 divide-y divide-line text-sm">
          {rows.map(([label, r]) => (
            <li key={label} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
              <span className="text-navy">{label}</span>
              <span>{fmt(r)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 rounded-xl bg-teal-brand/10 px-3 py-2 text-navy">
          Total estimado por persona: <b className="text-lg">{fmt(e.total)}</b>
          {e.travelers > 1 ? (
            <span className="block text-sm text-muted">
              Para {e.travelers} viajeros: US$ {(e.total[0] * e.travelers).toLocaleString("es-AR")} – {(e.total[1] * e.travelers).toLocaleString("es-AR")}
            </span>
          ) : null}
        </p>
        <p className="mt-2 text-xs text-muted">Estimación con valores promedio de mercado: las tarifas reales cambian según fechas, anticipación y disponibilidad. No es una cotización; tu asesor te pasa el precio final.</p>
      </Card>
    </section>
  );
}

/** Referencia de gastos del día a día (sin alojamiento ni vuelos). No es una cotización. */
function DailySpendCard({ items }: { items: ClientProposal["dailySpend"] }) {
  const byCurrency = new Map<string, { low: number; high: number }>();
  for (const d of items) {
    const t = byCurrency.get(d.currency) ?? { low: 0, high: 0 };
    byCurrency.set(d.currency, { low: t.low + d.low * d.nights, high: t.high + d.high * d.nights });
  }
  const fmt = (n: number) => n.toLocaleString("es-AR");
  return (
    <section className="avoid-break" data-daily-spend>
      <Card className="p-5">
        <h2 className="text-lg font-semibold">💶 Gastos diarios orientativos</h2>
        <p className="mt-1 text-sm text-muted">Lo que conviene separar por persona y por día para comidas, transporte local y entradas. No incluye alojamiento ni vuelos.</p>
        <ul className="mt-3 divide-y divide-line text-sm">
          {items.map((d) => (
            <li key={d.name} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
              <span className="font-semibold text-navy">{d.name}</span>
              <span>
                {SYMBOL[d.currency]} {fmt(d.low)}–{fmt(d.high)} <span className="text-muted">por día · {d.nights} noches</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 rounded-xl bg-sand-2 px-3 py-2 text-sm text-navy">
          Para todo el viaje, por persona:{" "}
          {[...byCurrency.entries()].map(([c, t], i) => (
            <b key={c}>
              {i > 0 ? " + " : ""}
              {SYMBOL[c as "USD" | "EUR"]} {fmt(t.low)}–{fmt(t.high)}
            </b>
          ))}{" "}
          aprox.
        </p>
        <p className="mt-2 text-xs text-muted">Referencia orientativa de VIORA según el destino y el nivel de viaje elegido; varía con el tipo de cambio y tus elecciones. No es una cotización.</p>
      </Card>
    </section>
  );
}

export function ItineraryView({
  proposal,
  stopImages,
  zoneImages = {},
  videos,
  printMode = false,
}: {
  proposal: ClientProposal;
  stopImages: Record<string, MediaItem[]>;
  zoneImages?: Record<string, MediaItem[]>;
  videos: MediaItem[];
  /** Ya no cambia la vista: siempre se ofrecen búsquedas en YouTube por ciudad. */
  videosConfigured?: boolean;
  printMode?: boolean;
}) {
  const it = proposal.itinerary;
  if (!it) return <Notice tone="warning">Todavía no hay un itinerario para esta propuesta.</Notice>;
  const stopIndex = new Map(it.stops.map((s, i) => [s.id, i]));
  return (
    <div className="space-y-12">
      {/* Ruta */}
      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="overflow-hidden">
          {printMode ? (
            <RouteSketch stops={it.stops} className="h-auto w-full" />
          ) : (
            <RouteMap stops={it.stops.map((s) => ({ ...s, zone: s.lodgingZone }))} className="h-[340px] w-full sm:h-[420px]" />
          )}
        </Card>
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Ciudades y noches</h2>
          <ol className="space-y-2">
            {it.stops.map((s, i) => (
              <li key={s.id} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3">
                <span className={cx("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white", ACCENTS[ACCENT_ORDER[i % 5]].bg)}>{i + 1}</span>
                <div className="flex-1">
                  <p className="font-semibold text-navy">
                    {s.name} <span className="font-normal text-muted">· {s.country}</span>
                  </p>
                  <p className="text-xs text-muted">
                    {s.nights} noches{s.arrivalDate ? ` · ${fmtDate(s.arrivalDate)} → ${fmtDate(s.departureDate)}` : ""}
                    {s.lodgingZone ? ` · Zona: ${s.lodgingZone}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          {it.legs.length > 0 && (
            <div className="space-y-2 pt-2">
              <h3 className="text-sm font-bold uppercase tracking-wide text-muted">Traslados</h3>
              {it.legs.map((l) => {
                const Icon = MODE_ICON[l.mode] ?? Bus;
                return (
                  <div key={`${l.from}-${l.to}`} className="flex items-start gap-2 text-sm">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-cyan-brand" aria-hidden />
                    <div>
                      <span className="font-semibold text-navy">
                        {l.from} → {l.to}
                      </span>{" "}
                      <span className="text-muted">
                        en {l.mode}
                        {l.hours ? ` · ~${l.hours} h` : ""} · {l.status}
                      </span>
                      {l.operators.length > 0 && (
                        <p className="text-xs text-muted">
                          Consultar en:{" "}
                          {l.operators.map((o, j) => (
                            <span key={o.url}>
                              {j > 0 && ", "}
                              <a href={o.url} target="_blank" rel="noopener noreferrer" className="underline">
                                {o.name}
                              </a>
                            </span>
                          ))}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Galería por destino */}
      <section className={cx(printMode && "print-break")}>
        <h2 className="text-xl font-semibold">Imaginate allá</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {it.stops.flatMap((s) =>
            (stopImages[s.id] ?? []).slice(0, printMode ? 1 : 3).map((img, j) => <SmartImage key={`${s.id}-${j}`} image={img} alt={s.name} thumb className="aspect-[4/3] w-full rounded-2xl" fallbackLabel={s.name} kind={s.kind} />),
          )}
          {it.stops.every((s) => !(stopImages[s.id] ?? []).length) &&
            it.stops.map((s) => <SmartImage key={s.id} image={null} alt={s.name} className="aspect-[4/3] w-full rounded-2xl" fallbackLabel={s.name} kind={s.kind} />)}
        </div>
        {!printMode && (
          <div className="mt-6">
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted">Videos</h3>
            {videos.length ? (
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {videos.slice(0, 2).map((v) => (
                  <figure key={v.id} className="overflow-hidden rounded-2xl border border-line bg-white">
                    <div className="aspect-video">
                      <iframe src={v.url} title={v.title ?? "Video"} loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen className="h-full w-full" referrerPolicy="strict-origin-when-cross-origin" />
                    </div>
                    <figcaption className="p-3 text-xs text-muted">
                      {v.title} ·{" "}
                      <a href={v.sourceUrl ?? "#"} target="_blank" rel="noopener noreferrer" className="underline">
                        {v.attribution}
                      </a>
                    </figcaption>
                  </figure>
                ))}
              </div>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {it.stops.map((s) => (
                <a
                  key={s.id}
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3.5 py-2 text-sm font-semibold text-navy hover:border-coral-brand"
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${s.name.split(/[:(]/)[0].trim()} ${s.country} qué ver viaje`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="text-coral-brand" aria-hidden>
                    ▶
                  </span>{" "}
                  Videos de {s.name} en YouTube
                </a>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Día por día */}
      <section className={cx(printMode && "print-break")}>
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <CalendarDays className="h-5 w-5 text-teal-brand" aria-hidden /> Día por día
        </h2>
        <p className="mt-1 text-sm text-muted">No llenamos todas las horas: dejamos tiempo libre para descansar y descubrir a tu ritmo.</p>
        <div className="mt-4 space-y-3">
          {it.days.map((d, i) => {
            const si = stopIndex.get(d.stopId) ?? 0;
            const accent = ACCENTS[ACCENT_ORDER[si % 5]];
            return (
              <details key={d.n} open={printMode || i < 2} className="avoid-break group rounded-2xl border border-line bg-white">
                <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
                  <span className={cx("flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl text-white", accent.bg)}>
                    <span className="text-[9px] font-bold uppercase leading-none">Día</span>
                    <span className="font-display text-lg leading-none">{d.n}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-navy">{d.title}</p>
                    <p className="text-xs text-muted">
                      {d.date ? `${fmtDate(d.date)} · ` : ""}
                      {it.stops[si]?.name} · {EFFORT[d.effort]}
                    </p>
                  </div>
                </summary>
                <div className="space-y-3 border-t border-line px-4 pb-4 pt-3 text-sm">
                  {d.logistics && (
                    <p className="flex gap-2 text-muted">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {d.logistics}
                    </p>
                  )}
                  {d.activities.map((a) => (
                    <div key={a.name} className="rounded-xl bg-sand p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-navy">{a.name}</p>
                        <Badge>~{a.hours} h</Badge>
                        {a.booking === "required" && (
                          <Badge tone="coral">
                            <Ticket className="h-3 w-3" aria-hidden /> Requiere reserva
                          </Badge>
                        )}
                        {a.booking === "recommended" && <Badge tone="orange">Reserva recomendada</Badge>}
                        {a.effort === 3 && (
                          <Badge tone="warning">
                            <Footprints className="h-3 w-3" aria-hidden /> Exigente
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-muted">{a.why}</p>
                      {a.seasonal && <p className="mt-1 text-xs text-muted">{a.seasonal}</p>}
                      {a.url && (
                        <a href={a.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-cyan-brand underline">
                          Sitio oficial <ExternalLink className="h-3 w-3" aria-hidden />
                        </a>
                      )}
                    </div>
                  ))}
                  <p className="text-muted">{d.freeTime}</p>
                  {d.food && (
                    <p className="flex gap-2 text-muted">
                      <Utensils className="mt-0.5 h-4 w-4 shrink-0 text-orange-brand" aria-hidden /> {d.food}
                    </p>
                  )}
                  {d.rainPlan && (
                    <p className="flex gap-2 text-muted">
                      <CloudRain className="mt-0.5 h-4 w-4 shrink-0 text-cyan-brand" aria-hidden /> {d.rainPlan}
                    </p>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      </section>

      {/* Alojamiento */}
      <section className="avoid-break">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <BedDouble className="h-5 w-5 text-purple-brand" aria-hidden /> Dónde alojarse
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {it.lodging.map((l) => {
            const stop = it.stops.find((s) => s.id === l.stopId);
            return (
              <Card key={l.stopId} className="overflow-hidden">
                {zoneImages[l.stopId]?.[0] && <SmartImage image={zoneImages[l.stopId][0]} alt={`Zona ${l.zone}, ${stop?.name}`} thumb className="aspect-[16/7] w-full" />}
                <div className="p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-muted">{stop?.name}</p>
                <p className="mt-1 font-semibold text-navy">{l.category}</p>
                <p className="text-sm text-muted">
                  Zona sugerida: <strong className="text-navy">{l.zone}</strong> — {l.zoneProfile}
                </p>
                {l.options.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm">
                    {l.options.map((o) => (
                      <li key={o.name}>
                        {o.url ? (
                          <a href={o.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-cyan-brand underline">
                            {o.name}
                          </a>
                        ) : (
                          <span className="font-semibold">{o.name}</span>
                        )}
                        {o.location ? <span className="text-muted"> · {o.location}</span> : null}
                      </li>
                    ))}
                  </ul>
                )}
                {!printMode && stop && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`hoteles ${l.zone.split(/[\/(]/)[0].trim()} ${stop.name.split(/[:(]/)[0].trim()}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-cyan-brand underline"
                  >
                    <MapPin className="h-4 w-4" aria-hidden /> Ver hoteles de esta zona en Google Maps
                  </a>
                )}
                <p className="mt-2 text-xs text-muted">Son ideas para ubicarte: no es una recomendación de hotel. Disponibilidad y condiciones a confirmar por un asesor.</p>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Costo aproximado del viaje */}
      {proposal.tripEstimate && <TripEstimateCard e={proposal.tripEstimate} />}

      {/* Gastos diarios orientativos */}
      {proposal.dailySpend?.length > 0 && <DailySpendCard items={proposal.dailySpend} />}

      {/* Recomendaciones y requisitos */}
      <section className="grid gap-6 md:grid-cols-2 avoid-break">
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Recomendaciones importantes</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-ink">
            {proposal.recommendations.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </Card>
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Documentación para verificar</h2>
          <p className="mt-2 text-sm text-muted">Los requisitos dependen de tu nacionalidad, tipo de pasaporte y escalas. Consultalos siempre en fuentes oficiales antes de reservar; VIORA no emite garantías migratorias.</p>
          {proposal.entryRequirements.length ? (
            <ul className="mt-3 space-y-2 text-sm">
              {proposal.entryRequirements.map((e) => (
                <li key={e.country}>
                  <p className="font-semibold text-navy">{e.country}</p>
                  {e.links.map((l) => (
                    <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="block text-cyan-brand underline">
                      {l.label}
                    </a>
                  ))}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">Viaje nacional: verificá la documentación de todos los viajeros (DNI vigente; autorizaciones si viajan menores).</p>
          )}
        </Card>
      </section>
    </div>
  );
}
