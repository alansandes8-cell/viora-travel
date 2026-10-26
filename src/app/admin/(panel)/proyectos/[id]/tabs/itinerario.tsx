import { ArrowDown, ArrowUp, Lock, LockOpen, Trash2 } from "lucide-react";
import { Panel, ghostBtn, smallBtn, smallInput } from "@/components/admin/bits";
import { Badge } from "@/components/ui";
import type { Destination, PlanDocument } from "@/core/types";
import {
  addActivity,
  addLodgingOption,
  addStop,
  applyAgentChange,
  editActivity,
  editDay,
  editLodging,
  moveStop,
  regenerate,
  removeActivity,
  removeLodgingOption,
  removeStop,
  replaceStop,
  setStopNights,
  toggleLock,
} from "../actions";

export function TabItinerario({ id, doc, canEdit, library }: { id: string; doc: PlanDocument; canEdit: boolean; library: Destination[] }) {
  const it = doc.itinerary;
  if (!it) return <p className="text-muted">Sin itinerario.</p>;
  const total = it.stops.reduce((a, s) => a + s.nights, 0);
  const options = library.slice().sort((a, b) => a.name.localeCompare(b.name, "es"));
  return (
    <div className="space-y-6">
      <Panel title={`Ruta · ${total} noches · ${it.days.length} días`} actions={<span className="text-xs text-muted">Los elementos editados quedan bloqueados <Lock className="inline h-3 w-3" /> y el motor no los sobrescribe.</span>}>
        <ol className="space-y-2">
          {it.stops.map((s, i) => (
            <li key={s.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-line p-2 text-sm">
              <span className="w-6 text-center font-display text-lg text-teal-brand">{i + 1}</span>
              <span className="min-w-40 flex-1 font-semibold">
                {s.name} <span className="font-normal text-muted">· {s.country}{s.arrivalDate ? ` · ${s.arrivalDate} → ${s.departureDate}` : ""}</span>
                {s.locked && <Lock className="ml-1 inline h-3.5 w-3.5 text-orange-brand" aria-label="Bloqueada" />}
              </span>
              {canEdit && (
                <>
                  <form action={setStopNights.bind(null, id, s.id)} className="flex items-center gap-1">
                    <input type="number" name="nights" min={1} max={60} defaultValue={s.nights} className={`${smallInput} w-16`} aria-label="Noches" />
                    <button className={ghostBtn}>Noches</button>
                  </form>
                  <form action={replaceStop.bind(null, id, s.id)} className="flex items-center gap-1">
                    <select name="destinationId" required defaultValue="" className={`${smallInput} max-w-40`} aria-label="Reemplazar por">
                      <option value="" disabled>
                        Reemplazar por…
                      </option>
                      {options.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    <button className={ghostBtn}>Reemplazar</button>
                  </form>
                  <form action={moveStop.bind(null, id, s.id, -1)}>
                    <button className={ghostBtn} aria-label="Subir" disabled={i === 0}>
                      <ArrowUp className="h-4 w-4" />
                    </button>
                  </form>
                  <form action={moveStop.bind(null, id, s.id, 1)}>
                    <button className={ghostBtn} aria-label="Bajar" disabled={i === it.stops.length - 1}>
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </form>
                  <form action={toggleLock.bind(null, id, "stop", s.id)}>
                    <button className={ghostBtn} aria-label={s.locked ? "Desbloquear" : "Bloquear"}>
                      {s.locked ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    </button>
                  </form>
                  {it.stops.length > 1 && (
                    <form action={removeStop.bind(null, id, s.id)}>
                      <button className={ghostBtn} aria-label="Quitar parada">
                        <Trash2 className="h-4 w-4 text-danger" />
                      </button>
                    </form>
                  )}
                </>
              )}
            </li>
          ))}
        </ol>
        {canEdit && (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <form action={addStop.bind(null, id)} className="flex items-center gap-2">
              <select name="destinationId" required defaultValue="" className={`${smallInput} flex-1`} aria-label="Agregar destino">
                <option value="" disabled>
                  Elegí un destino para agregar…
                </option>
                {options.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.country})
                  </option>
                ))}
              </select>
              <button className={smallBtn}>Agregar destino</button>
            </form>
            <form action={applyAgentChange.bind(null, id)} className="flex items-center gap-2">
              <input name="text" placeholder="Pedido en texto: «menos ciudades», «cambiar X por Y»…" className={`${smallInput} flex-1`} />
              <button className={smallBtn}>Aplicar</button>
            </form>
          </div>
        )}
        {canEdit && (
          <form action={regenerate.bind(null, id, undefined)} className="mt-3">
            <button className="text-xs font-semibold text-danger underline">Regenerar todo desde el cuestionario (crea una versión nueva sin las ediciones manuales; las anteriores quedan en el historial)</button>
          </form>
        )}
      </Panel>

      <Panel title="Día por día">
        <div className="space-y-3">
          {it.days.map((d) => (
            <details key={d.id} className="rounded-xl border border-line">
              <summary className="flex cursor-pointer flex-wrap items-center gap-2 p-3 text-sm">
                <span className="font-display text-lg text-teal-brand">{d.n}</span>
                <span className="font-semibold">{d.title}</span>
                <span className="text-muted">{d.date ?? ""} · {it.stops.find((s) => s.id === d.stopId)?.name}</span>
                <Badge>{({ arrival: "Llegada", full: "Día completo", transfer: "Traslado", departure: "Regreso", rest: "Descanso" } as Record<string, string>)[d.kind] ?? d.kind}</Badge>
                <Badge tone={d.effort === 3 ? "warning" : "neutral"}>esfuerzo {d.effort}</Badge>
                {d.locked && <Lock className="h-3.5 w-3.5 text-orange-brand" aria-label="Bloqueado" />}
              </summary>
              <div className="space-y-3 border-t border-line p-3">
                {d.activities.map((a) => (
                  <div key={a.id} className="rounded-lg bg-sand p-2">
                    <form action={editActivity.bind(null, id, d.id, a.id)} className="grid gap-2 sm:grid-cols-[2fr_1fr_80px_1fr_auto]">
                      <input name="name" defaultValue={a.name} className={smallInput} disabled={!canEdit} aria-label="Actividad" />
                      <input name="url" defaultValue={a.url ?? ""} placeholder="URL oficial" className={smallInput} disabled={!canEdit} aria-label="URL" />
                      <input name="hours" type="number" step="0.5" defaultValue={a.hours} className={smallInput} disabled={!canEdit} aria-label="Horas" />
                      <select name="booking" defaultValue={a.booking} className={smallInput} disabled={!canEdit} aria-label="Reserva">
                        <option value="required">Requiere reserva</option>
                        <option value="recommended">Reserva recomendada</option>
                        <option value="no">Sin reserva</option>
                      </select>
                      {canEdit && <button className={ghostBtn}>Guardar</button>}
                      <input name="why" defaultValue={a.why} className={`${smallInput} sm:col-span-5`} disabled={!canEdit} aria-label="Por qué" />
                    </form>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                      {a.locked ? "Editada por el agente" : a.origin === "engine" ? "Sugerida por el motor (biblioteca)" : a.origin}
                      {a.seasonal && ` · ${a.seasonal}`}
                      {canEdit && (
                        <form action={removeActivity.bind(null, id, d.id, a.id)}>
                          <button className="text-danger underline">Quitar</button>
                        </form>
                      )}
                    </div>
                  </div>
                ))}
                {canEdit && (
                  <form action={addActivity.bind(null, id, d.id)} className="grid gap-2 sm:grid-cols-[2fr_1fr_80px_1fr_auto]">
                    <input name="name" placeholder="Nueva actividad o experiencia" className={smallInput} aria-label="Nueva actividad" />
                    <input name="url" placeholder="URL oficial" className={smallInput} aria-label="URL" />
                    <input name="hours" type="number" step="0.5" placeholder="h" className={smallInput} aria-label="Horas" />
                    <select name="booking" className={smallInput} aria-label="Reserva">
                      <option value="no">Sin reserva</option>
                      <option value="recommended">Reserva recomendada</option>
                      <option value="required">Requiere reserva</option>
                    </select>
                    <button className={smallBtn}>Agregar</button>
                  </form>
                )}
                <form action={editDay.bind(null, id, d.id)} className="grid gap-2 sm:grid-cols-2">
                  <input name="title" defaultValue={d.title} className={smallInput} disabled={!canEdit} aria-label="Título del día" />
                  <input name="logistics" defaultValue={d.logistics ?? ""} placeholder="Notas logísticas" className={smallInput} disabled={!canEdit} aria-label="Logística" />
                  <input name="freeTime" defaultValue={d.freeTime} className={smallInput} disabled={!canEdit} aria-label="Tiempo libre" />
                  <input name="food" defaultValue={d.food ?? ""} placeholder="Recomendación gastronómica" className={smallInput} disabled={!canEdit} aria-label="Gastronomía" />
                  <input name="rainPlan" defaultValue={d.rainPlan ?? ""} placeholder="Alternativa si llueve" className={smallInput} disabled={!canEdit} aria-label="Plan de lluvia" />
                  {canEdit && (
                    <div className="flex gap-2">
                      <button className={ghostBtn}>Guardar día</button>
                    </div>
                  )}
                </form>
              </div>
            </details>
          ))}
        </div>
      </Panel>

      <Panel title="Alojamiento por parada">
        <div className="grid gap-4 lg:grid-cols-2">
          {it.lodging.map((l) => {
            const stop = it.stops.find((s) => s.id === l.stopId);
            return (
              <div key={l.id} className="rounded-xl border border-line p-3 text-sm">
                <p className="font-semibold">
                  {stop?.name} {l.locked && <Lock className="inline h-3.5 w-3.5 text-orange-brand" />}
                </p>
                <form action={editLodging.bind(null, id, l.stopId)} className="mt-2 grid gap-2">
                  <input name="category" defaultValue={l.category} className={smallInput} disabled={!canEdit} aria-label="Categoría" />
                  <input name="zone" defaultValue={l.zone} className={smallInput} disabled={!canEdit} aria-label="Zona" />
                  <input name="zoneProfile" defaultValue={l.zoneProfile} className={smallInput} disabled={!canEdit} aria-label="Perfil de la zona" />
                  <input name="why" defaultValue={l.why} className={smallInput} disabled={!canEdit} aria-label="Justificación" />
                  {canEdit && <button className={ghostBtn}>Guardar alojamiento</button>}
                </form>
                <p className="mt-3 text-xs font-semibold uppercase text-muted">Establecimientos (solo con fuente; sin precios)</p>
                {l.options.length ? (
                  <ul className="mt-1 space-y-1">
                    {l.options.map((o) => (
                      <li key={o.id} className="flex flex-wrap items-center gap-2">
                        {o.url ? (
                          <a href={o.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-cyan-brand underline">
                            {o.name}
                          </a>
                        ) : (
                          <span className="font-semibold">{o.name}</span>
                        )}
                        <span className="text-xs text-muted">{o.location} {o.source ? `· fuente: ${o.source}` : ""} · a confirmar: {o.toConfirm.join(", ")}</span>
                        {canEdit && (
                          <form action={removeLodgingOption.bind(null, id, l.stopId, o.id)}>
                            <button className="text-xs text-danger underline">Quitar</button>
                          </form>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted">El motor no propone hoteles por nombre para no inventar datos. Agregá opciones investigadas.</p>
                )}
                {canEdit && (
                  <form action={addLodgingOption.bind(null, id, l.stopId)} className="mt-2 grid gap-2 sm:grid-cols-2">
                    <input name="name" placeholder="Nombre del hotel" className={smallInput} required aria-label="Nombre del hotel" />
                    <input name="location" placeholder="Ubicación" className={smallInput} aria-label="Ubicación" />
                    <input name="url" placeholder="Sitio oficial (https://…)" className={smallInput} aria-label="Sitio oficial" />
                    <input name="source" placeholder="Fuente consultada" className={smallInput} aria-label="Fuente" />
                    <input name="pros" placeholder="Ventajas" className={smallInput} aria-label="Ventajas" />
                    <input name="cons" placeholder="Desventajas" className={smallInput} aria-label="Desventajas" />
                    <button className={smallBtn}>Agregar opción</button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
