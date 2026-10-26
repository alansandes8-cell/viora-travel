import { Panel, ghostBtn, smallInput } from "@/components/admin/bits";
import { VerificationTag } from "@/components/ui";
import { modeLabel } from "@/core/itinerary";
import { VERIFICATION_LABELS, VERIFICATION_STATUSES, type PlanDocument } from "@/core/types";
import { verifyLeg } from "../actions";

export function TabLogistica({ id, doc, canEdit }: { id: string; doc: PlanDocument; canEdit: boolean }) {
  const it = doc.itinerary;
  if (!it) return <p className="text-muted">Sin itinerario.</p>;
  const sources = new Map<string, string>();
  it.legs.forEach((l) => l.operators.forEach((o) => sources.set(o.url, `Operador: ${o.name}`)));
  it.legs.forEach((l) => l.duration.sources?.forEach((s) => s.url && sources.set(s.url, `Verificación traslado: ${s.label}${s.checkedAt ? ` (${s.checkedAt.slice(0, 10)})` : ""}`)));
  it.days.forEach((d) => d.activities.forEach((a) => a.url && sources.set(a.url, `Sitio oficial: ${a.name}`)));
  doc.entryRequirements.forEach((e) => e.links.forEach((l) => sources.set(l.url, `Requisitos ${e.country}: ${l.label}`)));
  it.lodging.forEach((l) => l.options.forEach((o) => o.url && sources.set(o.url, `Alojamiento: ${o.name}${o.source ? ` (${o.source})` : ""}`)));
  return (
    <div className="space-y-6">
      <Panel title="Vuelos a investigar">
        <div className="grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase text-muted">Aeropuertos de origen</p>
            <p className="font-semibold">{it.flights.originAirports.join(", ") || doc.profile.originLabel}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-muted">Llegada</p>
            <p className="font-semibold">{it.flights.destinationAirports.join(", ")}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-muted">Regreso desde</p>
            <p className="font-semibold">{it.flights.returnAirports.join(", ")}</p>
          </div>
        </div>
        <ul className="mt-3 space-y-1 text-sm">
          {it.flights.searchLinks.map((l) => (
            <li key={l.url}>
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-cyan-brand underline">
                Buscar: {l.label}
              </a>
            </li>
          ))}
        </ul>
        <ul className="mt-2 list-disc pl-5 text-xs text-muted">
          {it.flights.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
          <li>No hay una API de vuelos configurada: las tarifas observadas se cargan manualmente en «Componentes a cotizar».</li>
        </ul>
      </Panel>

      <Panel title="Traslados internos y verificación">
        {it.legs.length === 0 && <p className="text-sm text-muted">Destino único: sin traslados internos.</p>}
        <div className="space-y-3">
          {it.legs.map((l) => (
            <div key={l.id} className="rounded-xl border border-line p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">
                  {l.fromName} → {l.toName}
                </span>
                <span className="text-muted">
                  {modeLabel(l.mode)} · {l.duration.value ? `~${l.duration.value} h` : "duración s/d"} · {l.distanceKm ? `${l.distanceKm} km en línea recta` : ""}
                </span>
                <VerificationTag status={l.duration.status} />
              </div>
              {l.duration.note && <p className="mt-1 text-xs text-muted">{l.duration.note}</p>}
              {l.operators.length > 0 && (
                <p className="mt-1 text-xs">
                  Operadores posibles:{" "}
                  {l.operators.map((o) => (
                    <a key={o.url} href={o.url} target="_blank" rel="noopener noreferrer" className="mr-2 text-cyan-brand underline">
                      {o.name}
                    </a>
                  ))}
                </p>
              )}
              {l.notes && <p className="mt-1 text-xs text-muted">{l.notes}</p>}
              {canEdit && (
                <form action={verifyLeg.bind(null, id, l.id)} className="mt-2 grid gap-2 sm:grid-cols-6">
                  <select name="status" defaultValue={l.duration.status} className={smallInput} aria-label="Estado">
                    {VERIFICATION_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {VERIFICATION_LABELS[s]}
                      </option>
                    ))}
                  </select>
                  <select name="mode" defaultValue={l.mode} className={smallInput} aria-label="Medio">
                    {["plane", "train", "bus", "car", "private_transfer", "public_transport", "ferry"].map((m) => (
                      <option key={m} value={m}>
                        {modeLabel(m)}
                      </option>
                    ))}
                  </select>
                  <input name="hours" type="number" step="0.25" defaultValue={l.duration.value ?? ""} placeholder="Horas" className={smallInput} aria-label="Horas" />
                  <input name="sourceUrl" placeholder="URL de la fuente" className={smallInput} aria-label="Fuente" />
                  <input name="note" placeholder="Nota (horario, frecuencia…)" className={smallInput} aria-label="Nota" />
                  <button className={ghostBtn}>Guardar</button>
                </form>
              )}
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Requisitos migratorios y de salud a verificar">
        {doc.entryRequirements.length === 0 && <p className="text-sm text-muted">Viaje nacional.</p>}
        {doc.entryRequirements.map((e) => (
          <div key={e.country} className="mb-3 text-sm">
            <p className="font-semibold">{e.country}</p>
            <ul className="mt-1 space-y-1">
              {e.items.map((i) => (
                <li key={i.value} className="flex flex-wrap items-center gap-2">
                  <VerificationTag status={i.status} /> {i.value}
                </li>
              ))}
            </ul>
            <p className="mt-1 text-xs">
              {e.links.map((l) => (
                <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="mr-3 text-cyan-brand underline">
                  {l.label}
                </a>
              ))}
            </p>
          </div>
        ))}
        <p className="text-xs text-muted">Depende de la nacionalidad, tipo de pasaporte, residencia, escalas y fechas de cada viajero. No es asesoramiento migratorio oficial.</p>
      </Panel>

      <Panel title="Fuentes utilizadas">
        <ul className="space-y-1 text-sm">
          {[...sources.entries()].map(([url, label]) => (
            <li key={url}>
              {label} —{" "}
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-cyan-brand underline">
                {url}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">Clima y estacionalidad: biblioteca de destinos de VIORA (valores aproximados cargados como estimación; generado el {doc.generatedAt.slice(0, 10)}).</p>
      </Panel>
    </div>
  );
}
