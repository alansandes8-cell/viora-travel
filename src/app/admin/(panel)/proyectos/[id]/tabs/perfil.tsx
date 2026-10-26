import { Panel } from "@/components/admin/bits";
import { Badge } from "@/components/ui";
import { CRITERIA, CRITERIA_LABELS, INTERESTS, type PlanDocument } from "@/core/types";
import { INTEREST_LABELS } from "@/core/catalog";
import type { Bundle } from "./types";

export function TabPerfil({ b, doc }: { b: Bundle; doc: PlanDocument }) {
  const p = doc.profile;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="Necesidades declaradas por el cliente">
        <dl className="space-y-2 text-sm">
          {p.declared.map((d) => (
            <div key={d.label} className="flex justify-between gap-4 border-b border-line/60 pb-1">
              <dt className="text-muted">{d.label}</dt>
              <dd className="text-right font-semibold">{d.value}</dd>
            </div>
          ))}
        </dl>
      </Panel>
      <Panel title="Preferencias inferidas por el sistema">
        <ul className="space-y-3 text-sm">
          {p.inferred.map((i) => (
            <li key={i.key}>
              <p className="font-semibold text-navy">
                {i.label}: {i.value} <Badge tone={i.by === "ai" ? "purple" : "neutral"}>{i.by === "ai" ? "IA" : "Reglas"}</Badge> <Badge tone={i.confidence === "high" ? "success" : i.confidence === "medium" ? "orange" : "warning"}>confianza {i.confidence === "high" ? "alta" : i.confidence === "medium" ? "media" : "baja"}</Badge>
              </p>
              <p className="text-muted">{i.rationale}</p>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Datos faltantes">
        {p.missing.length ? (
          <ul className="space-y-1 text-sm">
            {p.missing.map((m) => (
              <li key={m.key}>
                {m.label} <Badge tone={m.impact === "high" ? "danger" : "warning"}>impacto {m.impact === "high" ? "alto" : m.impact === "medium" ? "medio" : "bajo"}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No faltan datos críticos.</p>
        )}
      </Panel>
      <Panel title="Intereses (0 a 1) y ponderaciones">
        <div className="flex flex-wrap gap-1.5">
          {INTERESTS.filter((i) => p.interests[i]).map((i) => (
            <Badge key={i} tone="teal">
              {INTEREST_LABELS[i]} {p.interests[i]!.toFixed(1)}
            </Badge>
          ))}
        </div>
        <table className="mt-4 w-full text-sm">
          <tbody>
            {CRITERIA.map((c) => (
              <tr key={c} className="border-b border-line/60">
                <td className="py-1">{CRITERIA_LABELS[c]}</td>
                <td className="py-1 text-right font-semibold">{doc.weights[c]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ul className="mt-3 list-disc pl-5 text-xs text-muted">
          {doc.weightNotes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </Panel>
      <Panel title="Respuestas completas del cuestionario" className="lg:col-span-2">
        <pre className="max-h-96 overflow-auto rounded-xl bg-sand p-3 text-xs">{JSON.stringify(b.intake?.answers ?? {}, null, 2)}</pre>
      </Panel>
    </div>
  );
}
