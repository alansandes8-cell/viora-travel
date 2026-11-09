import { Allura } from "next/font/google";
import { BedDouble, CalendarDays, ExternalLink, FileText, MapPin, MessageCircle, ShieldPlus, Smartphone, Ticket } from "lucide-react";
import { ITEM_KINDS, calendarWeeks, flag, isItemKind, shortDate, tripPhase, weekday, type ItemKind } from "@/core/my-trip";
import { cx } from "@/components/ui";
import { imagesFor } from "@/server/media-helpers";
import type { MediaItem } from "@/server/integrations/media";
import type { BookedTrip, TripItem } from "@/server/services/my-trip";

const script = Allura({ subsets: ["latin"], weight: "400", display: "swap" });

type FileMeta = { id: string; itemId: string | null; filename: string; mime: string; size: number };

const fileUrl = (id: string) => `/mi-viaje/archivo/${id}`;
const mapsUrl = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
const money = (n: string | null, cur: string) => (n && Number(n) > 0 ? `${cur === "EUR" ? "€" : cur === "ARS" ? "$" : "US$"} ${Number(n).toLocaleString("es-AR", { maximumFractionDigits: 0 })}` : null);
const KIND_ORDER: ItemKind[] = ["flight", "hotel", "train", "bus", "transfer", "car", "activity", "insurance", "other"];

/** Foto: enlace https directo o búsqueda por nombre de lugar (Wikipedia, con caché). */
async function photoFor(q: string, timeout = 1500): Promise<{ url: string; alt: string; credit: string | null } | null> {
  const s = q.trim();
  if (!s) return null;
  if (/^https:\/\//.test(s)) return { url: s, alt: "", credit: null };
  const r: MediaItem[] = await imagesFor(s, 1, timeout);
  return r[0] ? { url: r[0].thumbUrl ?? r[0].url, alt: s, credit: r[0].attribution } : null;
}

export async function TripView({ trip, items, files, today, whatsapp, europaGoUrl }: { trip: BookedTrip; items: TripItem[]; files: FileMeta[]; today: string; whatsapp: string | null; europaGoUrl: string }) {
  const plan = trip.plan;
  const phase = tripPhase(trip.startDate, trip.endDate, today);
  const cities = [...new Set(plan.map((d) => d.city).filter(Boolean))];
  const entryPhotos = plan.flatMap((d) => d.entries.map((e) => e.photo)).filter(Boolean);
  const [cover, cityPhotos, photos] = await Promise.all([
    photoFor(trip.coverPlace || cities[0] || "", 2500),
    Promise.all(cities.map((c) => photoFor(c))),
    Promise.all(entryPhotos.map((p) => photoFor(p))),
  ]);
  const cityPhoto = new Map(cities.map((c, i) => [c, cityPhotos[i]]));
  const entryPhoto = new Map(entryPhotos.map((p, i) => [p, photos[i]]));
  const itemById = new Map(items.map((i) => [i.id, i]));
  const filesOf = (itemId: string) => files.filter((f) => f.itemId === itemId);
  const general = files.filter((f) => !f.itemId);
  const groups = KIND_ORDER.map((k) => ({ k, list: items.filter((i) => (isItemKind(i.kind) ? i.kind : "other") === k) })).filter((g) => g.list.length);
  const flightVoucher = items.filter((i) => i.kind === "flight").flatMap((i) => filesOf(i.id))[0];
  const todayPlan = phase.kind === "during" ? plan.find((d) => d.date === today) : null;
  const weeks = calendarWeeks(trip.startDate, trip.endDate);
  const dayOf = new Map(plan.map((d) => [d.date, d]));
  const label = (d: (typeof plan)[number]) => d.summary || (d.entries[0] ? `${d.entries[0].time ? `${d.entries[0].time} · ` : ""}${d.entries[0].title}` : d.city ? `Día en ${d.city}` : "");

  return (
    <div className="pb-16">
      {/* Portada */}
      <section className="relative isolate overflow-hidden">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover.url} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-teal-brand to-navy" />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/10 via-black/25 to-black/60" />
        <div className="mx-auto flex min-h-[62vh] max-w-5xl flex-col items-center justify-center px-4 py-16 text-center text-white sm:min-h-[70vh]">
          <h1 className={cx(script.className, "text-7xl font-normal leading-none text-white drop-shadow-lg sm:text-9xl")}>{trip.title}</h1>
          {trip.subtitle && <p className="mt-4 text-lg font-bold uppercase tracking-[0.25em] drop-shadow sm:text-2xl">{trip.subtitle}</p>}
          {trip.travelers && <p className="mt-2 text-white/90 drop-shadow">{trip.travelers}</p>}
          <p className="mt-6 rounded-full bg-white/95 px-5 py-2 font-semibold text-navy shadow-lift">
            {phase.kind === "before" ? (phase.days === 1 ? "¡Mañana empieza tu viaje! ✈️" : `Faltan ${phase.days} días ✈️`) : phase.kind === "during" ? `¡Estás de viaje! Día ${phase.day} de ${phase.total} 🌍` : "¡Gracias por viajar con VIORA! 💛"}
          </p>
        </div>
        {cover?.credit && <p className="absolute bottom-1 right-2 text-[10px] text-white/70">{cover.credit}</p>}
      </section>

      {/* Accesos rápidos */}
      <nav aria-label="Accesos rápidos" className="sticky top-16 z-30 border-b border-line bg-white/95 backdrop-blur">
        <ul className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 py-2 scrollbar-none">
          {[
            ["#cronograma", "📅 Cronograma"],
            ["#reservas", "🧾 Reservas y vouchers"],
            ["#dia-a-dia", "🗺️ Día a día"],
            ...(trip.assistance ? [["#asistencia", "🛡️ Asistencia"]] : []),
          ].map(([href, text]) => (
            <li key={href}>
              <a href={href} className="inline-flex min-h-10 items-center whitespace-nowrap rounded-full border border-line px-3.5 text-sm font-semibold text-navy hover:bg-navy/5">
                {text}
              </a>
            </li>
          ))}
          {flightVoucher && (
            <li>
              <a href={fileUrl(flightVoucher.id)} target="_blank" className="inline-flex min-h-10 items-center whitespace-nowrap rounded-full bg-teal-brand px-3.5 text-sm font-semibold text-white">
                ✈️ Voucher del vuelo
              </a>
            </li>
          )}
          {trip.europaGo && (
            <li>
              <a href={europaGoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center whitespace-nowrap rounded-full bg-navy px-3.5 text-sm font-semibold text-white">
                📱 Europa Go
              </a>
            </li>
          )}
        </ul>
      </nav>

      <div className="mx-auto max-w-5xl space-y-14 px-4 pt-8">
        {todayPlan && (
          <section className="rounded-3xl bg-navy p-5 text-white">
            <p className="text-sm font-bold uppercase tracking-wider text-orange-brand">Hoy · {weekday(today)} {shortDate(today)}</p>
            <p className="mt-1 font-display text-2xl text-white">
              {flag(todayPlan.countryCode)} {todayPlan.city || todayPlan.summary}
            </p>
            <ul className="mt-3 space-y-1">
              {todayPlan.entries.map((e, i) => (
                <li key={i}>
                  <b>{e.time || "—"}</b> {e.title}
                </li>
              ))}
            </ul>
            <a href={`#dia-${todayPlan.date}`} className="mt-3 inline-block rounded-full bg-white px-4 py-2 text-sm font-semibold text-navy">
              Ver el plan de hoy
            </a>
          </section>
        )}

        {trip.notes && (
          <section className="rounded-3xl border border-teal-brand/30 bg-teal-brand/8 p-5">
            <p className="font-display text-xl text-navy">Un mensaje de tu asesor</p>
            <p className="mt-2 whitespace-pre-line text-ink">{trip.notes}</p>
          </section>
        )}

        {/* Cronograma total */}
        <section id="cronograma" className="scroll-mt-32">
          <Heading icon={<CalendarDays className="h-5 w-5" aria-hidden />}>Cronograma total</Heading>
          {/* Escritorio: calendario semanal como el PDF */}
          <div className="mt-4 hidden overflow-hidden rounded-2xl border border-navy/80 md:block">
            <div className="grid grid-cols-7 bg-white text-center text-sm font-semibold text-navy">
              {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map((d) => (
                <div key={d} className="border-b border-r border-navy/30 py-2 last:border-r-0">
                  {d}
                </div>
              ))}
            </div>
            {weeks.map((w, wi) => (
              <div key={wi} className="grid grid-cols-7 bg-white">
                {w.map((c) => {
                  const d = dayOf.get(c.date);
                  return (
                    <a
                      key={c.date}
                      href={c.inTrip ? `#dia-${c.date}` : undefined}
                      className={cx("flex min-h-28 flex-col border-b border-r border-navy/20 p-2 text-center text-xs last:border-r-0", c.inTrip ? "hover:bg-sand" : "bg-sand/50", c.date === today && "ring-2 ring-inset ring-coral-brand")}
                    >
                      <span className="flex items-center justify-between">
                        <span className="font-semibold underline">{shortDate(c.date)}</span>
                        <span className="text-lg leading-none">{d ? flag(d.countryCode) : ""}</span>
                      </span>
                      {c.countdown !== null && c.countdown > 0 && <span className="mt-3 text-coral-brand">Faltan {c.countdown} {c.countdown === 1 ? "día" : "días"}</span>}
                      {d && (
                        <span className="mt-2 text-navy">
                          {label(d)}
                          {d.city && !label(d).includes(d.city) && <b className="block">{d.city}</b>}
                        </span>
                      )}
                    </a>
                  );
                })}
              </div>
            ))}
          </div>
          {/* Celular: lista */}
          <ol className="mt-4 divide-y divide-line rounded-2xl border border-line bg-white md:hidden">
            {plan.map((d, i) => (
              <li key={d.date}>
                <a href={`#dia-${d.date}`} className={cx("flex items-center gap-3 px-3 py-2.5", d.date === today && "bg-coral-brand/10")}>
                  <span className="w-14 shrink-0 text-center">
                    <span className="block text-[11px] uppercase text-muted">{weekday(d.date).slice(0, 3)}</span>
                    <span className="block font-semibold text-navy">{shortDate(d.date)}</span>
                  </span>
                  <span className="text-xl">{flag(d.countryCode)}</span>
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="block truncate font-semibold text-navy">{label(d) || `Día ${i + 1}`}</span>
                    {d.city && !label(d).includes(d.city) && <span className="block truncate text-xs text-muted">{d.city}</span>}
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </section>

        {/* Reservas */}
        <section id="reservas" className="scroll-mt-32">
          <Heading icon={<FileText className="h-5 w-5" aria-hidden />}>Tus reservas</Heading>
          {groups.length === 0 && <p className="mt-3 text-muted">Tu asesor está cargando tus reservas. Muy pronto las vas a ver acá.</p>}
          {groups.map(({ k, list }) => (
            <div key={k} className="mt-6">
              <h3 className="text-xl font-semibold">
                {ITEM_KINDS[k].emoji} {ITEM_KINDS[k].plural}
              </h3>
              <div className="mt-3 space-y-4">
                {list.map((i) => (k === "hotel" ? <HotelCard key={i.id} item={i} files={filesOf(i.id)} /> : <ItemCard key={i.id} item={i} files={filesOf(i.id)} />))}
              </div>
            </div>
          ))}
          {general.length > 0 && (
            <div className="mt-6">
              <h3 className="text-xl font-semibold">📎 Otros documentos</h3>
              <Vouchers files={general} />
            </div>
          )}
        </section>

        {/* Día a día */}
        <section id="dia-a-dia" className="scroll-mt-32">
          <Heading icon={<MapPin className="h-5 w-5" aria-hidden />}>Día a día</Heading>
          <div className="mt-4 space-y-8">
            {plan.map((d, i) => {
              const newCity = d.city && d.city !== plan[i - 1]?.city;
              const cp = newCity ? cityPhoto.get(d.city) : null;
              return (
                <article key={d.date} id={`dia-${d.date}`} className="scroll-mt-32">
                  {newCity && (
                    <div className="relative mb-4 flex h-40 items-center justify-center overflow-hidden rounded-3xl sm:h-56">
                      {cp ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cp.url} alt={d.city} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-brand to-navy" />
                      )}
                      <div className="absolute inset-0 bg-black/30" />
                      <p className={cx(script.className, "relative text-6xl text-white drop-shadow-lg sm:text-8xl")}>{d.city}</p>
                    </div>
                  )}
                  <div className="inline-block rounded-r-xl bg-[#2b2b2b] px-4 py-2 text-white">
                    <p className="font-display text-lg uppercase tracking-wide text-white">
                      Día {i + 1}
                      {d.city ? ` – ${d.city}` : ""} {flag(d.countryCode)}
                    </p>
                    <p className="text-xs font-bold uppercase text-white/80">
                      {weekday(d.date)} {shortDate(d.date)}
                    </p>
                  </div>
                  {d.entries.length === 0 ? (
                    <p className="mt-3 text-muted">{d.summary || "Día libre para disfrutar a tu ritmo."}</p>
                  ) : (
                    <ol className="mt-3 space-y-3">
                      {d.entries.map((e, k) => {
                        const it = e.itemId ? itemById.get(e.itemId) : undefined;
                        const vouchers = it ? filesOf(it.id) : [];
                        const ph = e.photo ? entryPhoto.get(e.photo) : null;
                        return (
                          <li key={k} className="flex overflow-hidden rounded-xl border-2 border-[#2b2b2b] bg-white">
                            <div className="flex w-20 shrink-0 items-center justify-center bg-[#2b2b2b] px-2 font-display text-xl text-white sm:w-28 sm:text-3xl">{e.time ? `${e.time.replace(/:00$/, "")}${/:00$/.test(e.time) ? "hs" : ""}` : "•"}</div>
                            <div className="min-w-0 flex-1 p-3">
                              <p className="font-semibold text-navy">{e.title}</p>
                              {e.text && <p className="mt-0.5 whitespace-pre-line text-sm text-muted">{e.text}</p>}
                              <div className="mt-2 flex flex-wrap gap-2">
                                {vouchers.map((v) => (
                                  <a key={v.id} href={fileUrl(v.id)} target="_blank" className="inline-flex items-center gap-1 rounded-full bg-teal-brand px-2.5 py-1 text-xs font-semibold text-white">
                                    <Ticket className="h-3.5 w-3.5" aria-hidden /> Voucher
                                  </a>
                                ))}
                                {it?.voucherUrl && (
                                  <a href={it.voucherUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full bg-teal-brand px-2.5 py-1 text-xs font-semibold text-white">
                                    <Ticket className="h-3.5 w-3.5" aria-hidden /> Reserva
                                  </a>
                                )}
                                {e.link && (
                                  <a href={e.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-navy">
                                    <ExternalLink className="h-3.5 w-3.5" aria-hidden /> Más info
                                  </a>
                                )}
                                {(it?.address || e.photo) && !/^https:/.test(e.photo) && (
                                  <a href={mapsUrl(it?.address || `${e.photo}, ${d.city}`)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-navy">
                                    <MapPin className="h-3.5 w-3.5" aria-hidden /> Mapa
                                  </a>
                                )}
                              </div>
                            </div>
                            {ph && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={ph.url} alt={ph.alt} loading="lazy" className="hidden w-40 shrink-0 object-cover sm:block" />
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        {trip.assistance && (
          <section id="asistencia" className="scroll-mt-32 rounded-3xl border border-coral-brand/30 bg-coral-brand/5 p-5">
            <Heading icon={<ShieldPlus className="h-5 w-5" aria-hidden />}>Asistencia al viajero</Heading>
            <p className="mt-2 whitespace-pre-line text-ink">{trip.assistance}</p>
          </section>
        )}

        {trip.europaGo && (
          <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-navy to-teal-brand p-6 text-white">
            <Smartphone className="h-8 w-8" aria-hidden />
            <p className="mt-2 font-display text-2xl text-white">Tu app Europa Go</p>
            <p className="mt-1 text-white/90">Planificación, traductor, mapas sin internet, ubicaciones clave y planificador de presupuesto. Incluida en tu paquete.</p>
            <a href={europaGoUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 font-semibold text-navy">
              Abrir Europa Go <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          </section>
        )}

        {whatsapp && (
          <section className="text-center">
            <p className="text-muted">¿Necesitás algo durante el viaje?</p>
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#1f9d55] px-6 font-semibold text-white">
              <MessageCircle className="h-4 w-4" aria-hidden /> Escribile a tu asesor
            </a>
          </section>
        )}
      </div>
    </div>
  );
}

function Heading({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h2 className="inline-flex items-center gap-2 rounded-r-xl bg-[#2b2b2b] px-4 py-2 font-display text-xl uppercase tracking-wide text-white sm:text-2xl">
      {icon} {children}
    </h2>
  );
}

function Vouchers({ files, url }: { files: FileMeta[]; url?: string }) {
  if (!files.length && !url) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {files.map((f) => (
        <a key={f.id} href={fileUrl(f.id)} target="_blank" className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-teal-brand px-4 text-sm font-semibold text-white">
          <FileText className="h-4 w-4" aria-hidden /> {f.mime === "application/pdf" ? "Ver voucher" : "Ver imagen"}
          <span className="sr-only"> {f.filename}</span>
        </a>
      ))}
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-teal-brand px-4 text-sm font-semibold text-white">
          <ExternalLink className="h-4 w-4" aria-hidden /> Ver reserva
        </a>
      )}
    </div>
  );
}

const fmtDate = (iso: string | null) => (iso ? `${weekday(iso)} ${shortDate(iso)}` : "");

function ItemCard({ item: i, files }: { item: TripItem; files: FileMeta[] }) {
  const price = money(i.price, i.currency);
  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-navy">{i.title}</p>
          {i.provider && <p className="text-sm text-muted">{i.provider}</p>}
        </div>
        {i.confirmation && <span className="rounded-lg bg-sand-2 px-2 py-1 font-mono text-xs text-navy">Reserva: {i.confirmation}</span>}
      </div>
      {(i.startDate || i.endDate) && (
        <p className="mt-2 text-sm text-navy">
          <span className="capitalize">{fmtDate(i.startDate)}</span>
          {i.startTime && ` · ${i.startTime} h`}
          {i.endDate && (
            <>
              {" → "}
              <span className="capitalize">{fmtDate(i.endDate)}</span>
              {i.endTime && ` · ${i.endTime} h`}
            </>
          )}
        </p>
      )}
      {i.address && (
        <a href={mapsUrl(i.address)} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm text-navy underline">
          <MapPin className="h-3.5 w-3.5" aria-hidden /> {i.address}
        </a>
      )}
      {i.details && <p className="mt-2 whitespace-pre-line text-sm text-muted">{i.details}</p>}
      {price && <p className="mt-2 text-sm font-semibold text-navy">{price}</p>}
      <Vouchers files={files} url={i.voucherUrl || undefined} />
    </div>
  );
}

function HotelCard({ item: i, files }: { item: TripItem; files: FileMeta[] }) {
  const price = money(i.price, i.currency);
  const nights = i.startDate && i.endDate ? Math.round((Date.parse(i.endDate) - Date.parse(i.startDate)) / 86400000) : null;
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-[#f8f6f2] shadow-soft">
      <div className="grid gap-4 p-4 md:grid-cols-[1.3fr_1fr]">
        <div>
          <div className="inline-block rounded-r-xl bg-[#2b2b2b] px-4 py-2 text-white">
            <p className="font-semibold text-white">
              {i.title} {i.rating && <span>({i.rating} ⭐)</span>}
            </p>
            {i.startDate && i.endDate && (
              <p className="text-xs font-bold uppercase text-white/80">
                {shortDate(i.startDate)} al {shortDate(i.endDate)}
                {nights ? ` (${nights} ${nights === 1 ? "noche" : "noches"})` : ""}
              </p>
            )}
          </div>
          <ul className="mt-3 space-y-1 text-navy">
            {i.startTime && <li>Check in: {i.startTime} h</li>}
            {i.endTime && <li>Check out: {i.endTime} h</li>}
            {i.breakfast !== null && <li>Desayuno incluido: {i.breakfast ? "✅" : "🚫"}</li>}
            {i.confirmation && <li className="text-sm">Reserva: {i.confirmation}</li>}
          </ul>
          {price && (
            <p className="mt-3 font-display text-2xl">
              <span className="text-teal-brand">{price}</span> <span className="text-navy">en total</span>
            </p>
          )}
          {i.details && <p className="mt-2 whitespace-pre-line text-sm text-muted">{i.details}</p>}
          <Vouchers files={files} url={i.voucherUrl || undefined} />
        </div>
        {(i.address || i.place) && (
          <div className="text-center">
            <p className="font-semibold text-navy underline">Ubicación:</p>
            <p className="text-navy">{i.address || i.place}</p>
            <a href={mapsUrl(i.address ? `${i.title}, ${i.address}` : `${i.title}, ${i.place}`)} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#1a7f37] px-4 py-2 text-sm font-semibold text-white">
              <BedDouble className="h-4 w-4" aria-hidden /> ¿Cómo llegar?
            </a>
          </div>
        )}
      </div>
      {i.photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 px-4 pb-4">
          {i.photos.slice(0, 3).map((u) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={u} src={u} alt={`Foto de ${i.title}`} loading="lazy" className="aspect-[4/5] w-full rounded-lg object-cover" />
          ))}
        </div>
      )}
    </div>
  );
}
