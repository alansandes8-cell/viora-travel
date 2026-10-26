import { Panel, ghostBtn, smallBtn, smallInput } from "@/components/admin/bits";
import { Badge } from "@/components/ui";
import { CRITERIA, CRITERIA_LABELS, type Destination, type PlanDocument } from "@/core/types";
import { editAlternative, editTexts, selectAlternativeAgent } from "../actions";

export function TabAlternativas({ id, doc, canEdit }: { id: string; doc: PlanDocument; canEdit: boolean; library: Destination[] }) {
  const seasonal = new Map(doc.seasonal.map((s) => [s.alternativeId, s.windows]));
  return (
    <div className="space-y-6">
      <Panel title="Textos principales (visibles para el cliente)">
        <form action={editTexts.bind(null, id)} className="space-y-2">
          <input name="title" defaultValue={doc.title} className={`${smallInput} w-full font-semibold`} disabled={!canEdit} aria-label="Título" />
          <textarea name="concept" defaultValue={doc.concept} rows={2} className={`${smallInput} w-full`} disabled={!canEdit} aria-label="Concepto" />
          {canEdit && <button className={smallBtn}>Guardar textos</button>}
        </form>
      </Panel>
      {doc.alternatives.map((a, i) => (
        <Panel
          key={a.id}
          title={
            <span className="flex flex-wrap items-center gap-2">
              {String.fromCharCode(65 + i)}. {a.title} <Badge tone="teal">{a.compatibility}/100</Badge>
              {doc.selectedAlternativeId === a.id && <Badge tone="success">Elegida</Badge>}
              {a.labels.map((l) => (
                <Badge key={l}>{l}</Badge>
              ))}
            </span>
          }
          actions={
            canEdit && doc.selectedAlternativeId !== a.id ? (
              <form action={selectAlternativeAgent.bind(null, id, a.id)}>
                <button className={ghostBtn}>Usar esta alternativa</button>
              </form>
            ) : null
          }
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <p className="text-sm text-muted">{a.stops.map((s) => `${s.name} (${s.nights}n)`).join(" → ")} · {a.experienceType} · logística {a.logisticsComplexity} · {a.lodgingChanges} cambio(s) de hotel · tranquilidad {a.tranquility}</p>
              <p className="mt-2 text-sm">
                <strong>Clima ({a.climateNote.status === "estimate" ? "estimación" : a.climateNote.status}):</strong> {a.climateNote.value}
              </p>
              <p className="mt-1 text-sm">
                <strong>Viaje desde el origen:</strong> {a.travelFromOrigin.value ? `~${a.travelFromOrigin.value} h (estimación por distancia)` : "no estimado"}
              </p>
              {a.warnings.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-sm text-warning">
                  {a.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-sm">
                <strong>Requisitos a verificar:</strong>{" "}
                {a.entryChecks.length
                  ? a.entryChecks.map((e) => (
                      <a key={e.url} href={e.url} target="_blank" rel="noopener noreferrer" className="mr-2 text-cyan-brand underline">
                        {e.label}
                      </a>
                    ))
                  : "—"}
              </p>
              {(seasonal.get(a.id) ?? []).length > 0 && (
                <div className="mt-3 text-sm">
                  <strong>Comparación estacional (hipótesis):</strong>
                  <ul className="list-disc pl-5">
                    {seasonal.get(a.id)!.map((w) => (
                      <li key={w.month}>
                        {w.label}: clima {w.climateScore}/10 — {w.hypothesis}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <form action={editAlternative.bind(null, id, a.id)} className="mt-4 space-y-2">
                <label className="block text-xs font-semibold text-muted">
                  Resumen
                  <textarea name="summary" rows={2} defaultValue={a.summary} className={`${smallInput} mt-1 w-full`} disabled={!canEdit} />
                </label>
                <label className="block text-xs font-semibold text-muted">
                  Motivo principal
                  <textarea name="mainReason" rows={2} defaultValue={a.mainReason} className={`${smallInput} mt-1 w-full`} disabled={!canEdit} />
                </label>
                <label className="block text-xs font-semibold text-muted">
                  Perfil ideal
                  <input name="idealTraveler" defaultValue={a.idealTraveler} className={`${smallInput} mt-1 w-full`} disabled={!canEdit} />
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="block text-xs font-semibold text-muted">
                    Ventajas (una por línea)
                    <textarea name="pros" rows={4} defaultValue={a.pros.join("\n")} className={`${smallInput} mt-1 w-full`} disabled={!canEdit} />
                  </label>
                  <label className="block text-xs font-semibold text-muted">
                    Desventajas (una por línea)
                    <textarea name="cons" rows={4} defaultValue={a.cons.join("\n")} className={`${smallInput} mt-1 w-full`} disabled={!canEdit} />
                  </label>
                </div>
                {canEdit && <button className={smallBtn}>Guardar textos de la alternativa</button>}
              </form>
            </div>
            <table className="h-fit w-full text-sm">
              <thead className="text-xs uppercase text-muted">
                <tr>
                  <th className="py-1 text-left">Criterio</th>
                  <th className="py-1 text-right">Puntaje</th>
                  <th className="py-1 text-right">Peso</th>
                </tr>
              </thead>
              <tbody>
                {CRITERIA.map((c) => (
                  <tr key={c} className="border-t border-line/60 align-top">
                    <td className="py-1.5">
                      <p className="font-semibold">{CRITERIA_LABELS[c]}</p>
                      <ul className="text-xs text-muted">
                        {a.scores[c].factors.map((f) => (
                          <li key={f.text}>
                            {f.sign === "+" ? "▲" : "▼"} {f.text}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="py-1.5 text-right font-semibold">{a.scores[c].value}</td>
                    <td className="py-1.5 text-right text-muted">{a.scores[c].weight}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ))}
    </div>
  );
}
