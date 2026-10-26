import { Panel, fmtDateTime, ghostBtn, smallBtn, smallInput } from "@/components/admin/bits";
import { Badge } from "@/components/ui";
import { QUOTE_CATEGORIES, QUOTE_CATEGORY_LABELS, type QuoteCategory } from "@/core/pricing";
import { addComponent, addObservation, deleteComponent, setComponentVerification } from "../actions";
import type { Bundle } from "./types";

const VER = { pending: "Pendiente", in_progress: "En proceso", verified: "Verificado", done: "Completado", unavailable: "No disponible" } as Record<string, string>;
const OBS = {
  consulted_real: "Precio real consultado",
  observed_on_date: "Precio observado en una fecha",
  reference_estimate: "Estimación de referencia",
  historical: "Dato histórico",
  unavailable: "No disponible",
} as Record<string, string>;

export function TabCotizar({ id, b, canEdit }: { id: string; b: Bundle; canEdit: boolean }) {
  return (
    <div className="space-y-6">
      <Panel title="Componentes a cotizar" actions={<span className="text-xs text-muted">Generados desde el itinerario · editables</span>}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="text-left text-xs uppercase text-muted">
              <tr>
                <th className="py-1">Categoría</th>
                <th>Descripción</th>
                <th>Fechas</th>
                <th>Pax</th>
                <th>Especificaciones</th>
                <th>Proveedor / fuente y estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {b.components.map((c) => (
                <tr key={c.id} className="border-t border-line/60 align-top">
                  <td className="py-2 font-semibold">{QUOTE_CATEGORY_LABELS[c.category as QuoteCategory] ?? c.category}</td>
                  <td className="py-2">{c.description}</td>
                  <td className="py-2 text-xs">{c.dateFrom ?? "—"}{c.dateTo ? ` → ${c.dateTo}` : ""}</td>
                  <td className="py-2">{c.pax ?? "—"}</td>
                  <td className="py-2 text-xs">{c.specs}</td>
                  <td className="py-2">
                    <form action={setComponentVerification.bind(null, id, c.id)} className="flex flex-wrap gap-1">
                      <input name="supplier" defaultValue={c.supplier ?? ""} placeholder="Proveedor" className={`${smallInput} w-28`} disabled={!canEdit} aria-label="Proveedor" />
                      <input name="sourceUrl" defaultValue={c.sourceUrl ?? ""} placeholder="URL" className={`${smallInput} w-28`} disabled={!canEdit} aria-label="URL" />
                      <select name="verification" defaultValue={c.verification} className={smallInput} disabled={!canEdit} aria-label="Estado">
                        {Object.entries(VER).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                      {canEdit && <button className={ghostBtn}>OK</button>}
                    </form>
                  </td>
                  <td className="py-2">
                    {canEdit && (
                      <form action={deleteComponent.bind(null, id, c.id)}>
                        <button className="text-xs text-danger underline">Quitar</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {canEdit && (
          <form action={addComponent.bind(null, id)} className="mt-3 grid gap-2 sm:grid-cols-7">
            <select name="category" className={smallInput} aria-label="Categoría">
              {QUOTE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {QUOTE_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
            <input name="description" placeholder="Descripción" className={`${smallInput} sm:col-span-2`} aria-label="Descripción" />
            <input name="dateFrom" type="date" className={smallInput} aria-label="Desde" />
            <input name="dateTo" type="date" className={smallInput} aria-label="Hasta" />
            <input name="pax" type="number" placeholder="Pax" className={smallInput} aria-label="Pax" />
            <button className={smallBtn}>Agregar</button>
          </form>
        )}
      </Panel>

      <Panel title="Consultas económicas registradas" actions={<span className="text-xs text-muted">Cada importe con su tipo, fecha y fuente. Una búsqueda anterior no es una tarifa vigente.</span>}>
        {b.observations.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="text-left text-xs uppercase text-muted">
                <tr>
                  <th>Tipo</th>
                  <th>Componente</th>
                  <th>Proveedor</th>
                  <th>Consultado</th>
                  <th>Viaje</th>
                  <th>Pax</th>
                  <th>Importe</th>
                  <th>Incluye / no incluye</th>
                  <th>Vigencia</th>
                </tr>
              </thead>
              <tbody>
                {b.observations.map((o) => {
                  const expired = o.validUntil && o.validUntil < new Date();
                  return (
                    <tr key={o.id} className="border-t border-line/60 align-top">
                      <td className="py-2">
                        <Badge tone={o.kind === "consulted_real" ? "success" : o.kind === "unavailable" ? "danger" : "neutral"}>{OBS[o.kind]}</Badge>
                      </td>
                      <td className="py-2 text-xs">{b.components.find((c) => c.id === o.componentId)?.description ?? "—"}</td>
                      <td className="py-2">
                        {o.url ? (
                          <a href={o.url} target="_blank" rel="noopener noreferrer" className="text-cyan-brand underline">
                            {o.provider ?? "Fuente"}
                          </a>
                        ) : (
                          o.provider
                        )}
                      </td>
                      <td className="py-2 text-xs">{fmtDateTime(o.observedAt)}</td>
                      <td className="py-2 text-xs">{o.travelFrom ?? ""}{o.travelTo ? ` → ${o.travelTo}` : ""}</td>
                      <td className="py-2">{o.pax}</td>
                      <td className="py-2 font-semibold">{o.amount ? `${o.currency} ${Number(o.amount).toLocaleString("es-AR", { minimumFractionDigits: 2 })}` : "—"}</td>
                      <td className="py-2 text-xs">
                        {o.includes && <p>✓ {o.includes}</p>}
                        {o.excludes && <p>✗ {o.excludes}</p>}
                        {o.baggage && <p>Equipaje: {o.baggage}</p>}
                        {o.cancellation && <p>Cancelación: {o.cancellation}</p>}
                        {o.availability && <p>Disponibilidad: {o.availability}</p>}
                      </td>
                      <td className="py-2 text-xs">{o.validUntil ? <span className={expired ? "font-semibold text-danger" : ""}>{fmtDateTime(o.validUntil)}{expired ? " (vencida)" : ""}</span> : "Desconocida"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">Todavía no se registraron consultas de precios.</p>
        )}
        {canEdit && (
          <form action={addObservation.bind(null, id)} className="mt-4 grid gap-2 rounded-xl bg-sand p-3 sm:grid-cols-4">
            <select name="kind" className={smallInput} aria-label="Tipo de dato">
              {Object.entries(OBS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <select name="componentId" className={smallInput} aria-label="Componente">
              <option value="">(sin componente)</option>
              {b.components.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.description}
                </option>
              ))}
            </select>
            <input name="provider" placeholder="Proveedor" className={smallInput} aria-label="Proveedor" />
            <input name="url" placeholder="Enlace de la consulta" className={smallInput} aria-label="Enlace" />
            <input name="observedAt" type="datetime-local" className={smallInput} aria-label="Fecha de consulta" />
            <input name="travelFrom" type="date" className={smallInput} aria-label="Viaje desde" />
            <input name="travelTo" type="date" className={smallInput} aria-label="Viaje hasta" />
            <input name="pax" type="number" placeholder="Pax" className={smallInput} aria-label="Pax" />
            <input name="currency" placeholder="Moneda (USD)" maxLength={3} className={smallInput} aria-label="Moneda" />
            <input name="amount" placeholder="Importe" inputMode="decimal" className={smallInput} aria-label="Importe" />
            <input name="includes" placeholder="Qué incluye" className={smallInput} aria-label="Incluye" />
            <input name="excludes" placeholder="Qué no incluye" className={smallInput} aria-label="No incluye" />
            <input name="baggage" placeholder="Equipaje" className={smallInput} aria-label="Equipaje" />
            <input name="cancellation" placeholder="Cancelación" className={smallInput} aria-label="Cancelación" />
            <input name="availability" placeholder="Disponibilidad" className={smallInput} aria-label="Disponibilidad" />
            <input name="validUntil" type="datetime-local" className={smallInput} aria-label="Válido hasta" />
            <button className={`${smallBtn} sm:col-span-4`}>Registrar consulta</button>
          </form>
        )}
      </Panel>
    </div>
  );
}
