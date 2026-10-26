import { Panel, ghostBtn, smallBtn, smallInput } from "@/components/admin/bits";
import { Badge, Notice } from "@/components/ui";
import { computeQuote, QUOTE_CATEGORIES, QUOTE_CATEGORY_LABELS, type QuoteCategory } from "@/core/pricing";
import { addQuoteLine, createQuote, deleteQuoteLine, publishPricedProposal, updateQuote } from "../actions";
import type { Bundle } from "./types";

export function TabPresupuesto({ id, b, canEdit }: { id: string; b: Bundle; canEdit: boolean }) {
  return (
    <div className="space-y-6">
      <Notice>
        Presupuesto interno: solo visible en este panel. No se asumen márgenes, impuestos, comisiones ni tipos de cambio: todos los valores los carga el agente. La propuesta comercial presupuestada es un documento independiente de la propuesta inspiracional.
      </Notice>
      {canEdit && (
        <form action={createQuote.bind(null, id)} className="flex flex-wrap items-end gap-2">
          <input name="currency" defaultValue="USD" maxLength={3} className={`${smallInput} w-20`} aria-label="Moneda" />
          <input name="travelers" type="number" defaultValue={b.project.travelers ?? 1} className={`${smallInput} w-20`} aria-label="Viajeros" />
          <button className={smallBtn}>Nuevo presupuesto</button>
        </form>
      )}
      {b.quotes.length === 0 && <p className="text-sm text-muted">Todavía no hay presupuestos. Primero registrá las cotizaciones reales en «Componentes a cotizar».</p>}
      {b.quotes.map((q) => {
        const lines = b.quoteLines.filter((l) => l.quoteId === q.id);
        const r = computeQuote({
          currency: q.currency,
          travelers: q.travelers,
          lines: lines.map((l) => ({ id: l.id, category: l.category as QuoteCategory, description: l.description, quantity: l.quantity, unitAmount: l.unitAmount, currency: l.currency, fxRate: l.fxRate ?? undefined, perPerson: l.perPerson })),
          taxes: q.taxes,
          marginPercent: q.marginPercent ?? undefined,
          managementFee: q.managementFee ?? undefined,
        });
        const money = (v: string) => `${q.currency} ${Number(v).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        return (
          <Panel key={q.id} title={<span className="flex items-center gap-2">Presupuesto {q.currency} · {q.travelers} viajero(s) <Badge tone={q.status === "approved" ? "success" : "neutral"}>{q.status === "approved" ? "Aprobado / publicado" : "Borrador"}</Badge></span>}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="text-left text-xs uppercase text-muted">
                  <tr>
                    <th>Categoría</th>
                    <th>Descripción</th>
                    <th>Cálculo</th>
                    <th className="text-right">Total ({q.currency})</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => {
                    const lr = r.lines.find((x) => x.id === l.id);
                    return (
                      <tr key={l.id} className="border-t border-line/60">
                        <td className="py-1.5">{QUOTE_CATEGORY_LABELS[l.category as QuoteCategory]}</td>
                        <td className="py-1.5">{l.description}</td>
                        <td className="py-1.5 text-xs text-muted">{lr?.formula ?? "Error en la línea"}</td>
                        <td className="py-1.5 text-right font-semibold">{lr ? Number(lr.total).toLocaleString("es-AR", { minimumFractionDigits: 2 }) : "—"}</td>
                        <td className="py-1.5 text-right">
                          {canEdit && (
                            <form action={deleteQuoteLine.bind(null, id, l.id)}>
                              <button className="text-xs text-danger underline">Quitar</button>
                            </form>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {canEdit && (
              <form action={addQuoteLine.bind(null, id, q.id)} className="mt-3 grid gap-2 sm:grid-cols-8">
                <select name="componentId" className={`${smallInput} sm:col-span-2`} aria-label="Componente">
                  <option value="">(línea libre)</option>
                  {b.components.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.description}
                    </option>
                  ))}
                </select>
                <select name="category" className={smallInput} aria-label="Categoría">
                  {QUOTE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {QUOTE_CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
                <input name="description" placeholder="Descripción" className={smallInput} aria-label="Descripción" />
                <input name="quantity" placeholder="Cant." defaultValue="1" className={smallInput} aria-label="Cantidad" />
                <input name="unitAmount" placeholder="Importe unitario" inputMode="decimal" className={smallInput} required aria-label="Importe unitario" />
                <input name="currency" placeholder={q.currency} maxLength={3} className={smallInput} aria-label="Moneda de la línea" />
                <input name="fxRate" placeholder="TC → moneda" inputMode="decimal" className={smallInput} aria-label="Tipo de cambio" />
                <label className="flex items-center gap-1 text-xs sm:col-span-2">
                  <input type="checkbox" name="perPerson" /> Por persona (× viajeros)
                </label>
                <button className={`${smallBtn} sm:col-span-2`}>Agregar línea</button>
              </form>
            )}

            <div className="mt-5 grid gap-6 lg:grid-cols-2">
              <dl className="space-y-1 text-sm">
                {r.byCategory.map((c) => (
                  <div key={c.category} className="flex justify-between">
                    <dt className="text-muted">{c.label}</dt>
                    <dd>{money(c.subtotal)}</dd>
                  </div>
                ))}
                <div className="flex justify-between border-t border-line pt-1 font-semibold">
                  <dt>Total de servicios</dt>
                  <dd>{money(r.servicesTotal)}</dd>
                </div>
                {r.taxes.map((t) => (
                  <div key={t.label} className="flex justify-between">
                    <dt className="text-muted">
                      {t.label} ({t.formula})
                    </dt>
                    <dd>{money(t.amount)}</dd>
                  </div>
                ))}
                <div className="flex justify-between">
                  <dt className="text-muted">Margen comercial ({q.marginPercent ?? 0}% sobre servicios + impuestos)</dt>
                  <dd>{money(r.marginAmount)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Cargo de gestión</dt>
                  <dd>{money(r.managementFee)}</dd>
                </div>
                <div className="flex justify-between border-t border-line pt-1 text-base font-bold text-navy">
                  <dt>Precio final de venta</dt>
                  <dd>{money(r.finalPrice)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Por persona</dt>
                  <dd>{money(r.perPerson)}</dd>
                </div>
                {!r.ok && <Notice tone="danger">{r.errors.join(" ")}</Notice>}
              </dl>
              <form action={updateQuote.bind(null, id, q.id)} className="grid gap-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <input name="currency" defaultValue={q.currency} className={smallInput} aria-label="Moneda" disabled={!canEdit} />
                  <input name="travelers" type="number" defaultValue={q.travelers} className={smallInput} aria-label="Viajeros" disabled={!canEdit} />
                  <input name="marginPercent" defaultValue={q.marginPercent ?? ""} placeholder="Margen %" className={smallInput} aria-label="Margen" disabled={!canEdit} />
                  <input name="managementFee" defaultValue={q.managementFee ?? ""} placeholder="Cargo de gestión" className={smallInput} aria-label="Cargo de gestión" disabled={!canEdit} />
                  <input name="fxNote" defaultValue={q.fxNote ?? ""} placeholder="Tipo de cambio usado y fuente" className={smallInput} aria-label="Tipo de cambio" disabled={!canEdit} />
                  <input name="fxDate" type="date" defaultValue={q.fxDate ?? ""} className={smallInput} aria-label="Fecha del tipo de cambio" disabled={!canEdit} />
                </div>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="grid grid-cols-3 gap-2">
                    <input name={`taxLabel${i}`} defaultValue={q.taxes[i]?.label ?? ""} placeholder="Impuesto / cargo" className={smallInput} aria-label="Impuesto" disabled={!canEdit} />
                    <select name={`taxMode${i}`} defaultValue={q.taxes[i]?.mode ?? "percent"} className={smallInput} aria-label="Modo" disabled={!canEdit}>
                      <option value="percent">% sobre servicios</option>
                      <option value="fixed">Importe fijo</option>
                    </select>
                    <input name={`taxValue${i}`} defaultValue={q.taxes[i]?.value ?? ""} placeholder="Valor" className={smallInput} aria-label="Valor" disabled={!canEdit} />
                  </div>
                ))}
                <textarea name="included" rows={2} defaultValue={q.included ?? ""} placeholder="Servicios incluidos" className={smallInput} disabled={!canEdit} />
                <textarea name="excluded" rows={2} defaultValue={q.excluded ?? ""} placeholder="Servicios no incluidos" className={smallInput} disabled={!canEdit} />
                <textarea name="paymentTerms" rows={2} defaultValue={q.paymentTerms ?? ""} placeholder="Condiciones de pago" className={smallInput} disabled={!canEdit} />
                <textarea name="conditions" rows={2} defaultValue={q.conditions ?? ""} placeholder="Condiciones comerciales" className={smallInput} disabled={!canEdit} />
                <label className="text-xs font-semibold text-muted">
                  Vigencia de la propuesta
                  <input name="validUntil" type="date" defaultValue={q.validUntil ?? ""} className={`${smallInput} mt-1 w-full`} disabled={!canEdit} />
                </label>
                {canEdit && <button className={ghostBtn}>Guardar presupuesto</button>}
              </form>
            </div>
            {canEdit && (
              <form action={publishPricedProposal.bind(null, id, q.id)} className="mt-4">
                <button className={smallBtn} disabled={!r.ok || lines.length === 0}>
                  Generar propuesta comercial con precios (documento independiente)
                </button>
              </form>
            )}
          </Panel>
        );
      })}
    </div>
  );
}
