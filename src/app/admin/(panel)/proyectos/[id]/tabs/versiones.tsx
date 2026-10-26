import { Panel, fmtDateTime, ghostBtn } from "@/components/admin/bits";
import { Badge } from "@/components/ui";
import { diffPlans } from "@/core/diff";
import { eq } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { resolveChangeRequest, restoreVersion } from "../actions";
import type { Bundle } from "./types";

const AUTHOR = { engine: "Motor", ai: "IA", agent: "Agente", client: "Cliente" } as Record<string, string>;

export async function TabVersiones({ id, b, canEdit }: { id: string; b: Bundle; canEdit: boolean }) {
  // Diferencias entre cada versión y la anterior (cargamos los documentos de las últimas 15).
  const recent = b.versions.slice(0, 15);
  const docs = await Promise.all(recent.map((v) => db().query.planVersions.findFirst({ columns: { id: true, document: true }, where: eq(schema.planVersions.id, v.id) })));
  const byId = new Map(docs.filter(Boolean).map((d) => [d!.id, d!.document]));
  return (
    <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
      <Panel title="Historial de versiones">
        <ol className="space-y-3">
          {b.versions.map((v, i) => {
            const prev = b.versions[i + 1];
            const diff = prev && byId.get(v.id) && byId.get(prev.id) ? diffPlans(byId.get(prev.id)!, byId.get(v.id)!) : [];
            return (
              <li key={v.id} className="rounded-xl border border-line p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-lg text-navy">v{v.number}</span>
                  <Badge tone={v.authorKind === "agent" ? "purple" : v.authorKind === "client" ? "coral" : v.authorKind === "ai" ? "cyan" : "neutral"}>{AUTHOR[v.authorKind]}</Badge>
                  {v.status === "approved" && <Badge tone="success">Aprobada</Badge>}
                  {b.project.publishedVersionId === v.id && <Badge tone="teal">Visible para el cliente</Badge>}
                  {b.project.currentVersionId === v.id && <Badge>Actual</Badge>}
                  <span className="text-xs text-muted">{fmtDateTime(v.createdAt)}</span>
                  {canEdit && b.project.currentVersionId !== v.id && (
                    <form action={restoreVersion.bind(null, id, v.id)} className="ml-auto">
                      <button className={ghostBtn}>Restaurar como nueva versión</button>
                    </form>
                  )}
                </div>
                <p className="mt-1">{v.reason}</p>
                {v.changeSummary.length > 0 && (
                  <ul className="mt-1 list-disc pl-5 text-xs text-muted">
                    {v.changeSummary.map((c, j) => (
                      <li key={j}>{c}</li>
                    ))}
                  </ul>
                )}
                {diff.length > 0 && (
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer font-semibold text-navy">Comparar con v{prev!.number}</summary>
                    <ul className="mt-1 list-disc pl-5">
                      {diff.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </li>
            );
          })}
        </ol>
      </Panel>
      <Panel title="Pedidos de cambio">
        {b.changes.length ? (
          <ul className="space-y-2 text-sm">
            {b.changes.map((c) => (
              <li key={c.id} className="rounded-xl bg-sand p-2">
                <p>
                  «{c.text}» <span className="text-xs text-muted">({c.source === "client" ? "cliente" : "agente"}, {fmtDateTime(c.createdAt)})</span>
                </p>
                <Badge tone={c.status === "applied" ? "success" : c.status === "rejected" ? "danger" : "warning"}>
                  {c.status === "applied" ? "Aplicado" : c.status === "rejected" ? "Descartado" : c.status === "unmatched" ? "No interpretado: revisar" : "Requiere aprobación"}
                </Badge>
                {canEdit && (c.status === "pending_approval" || c.status === "unmatched") && (
                  <div className="mt-1 flex gap-2">
                    <form action={resolveChangeRequest.bind(null, id, c.id, "applied")}>
                      <button className="text-xs font-semibold text-success underline">Marcar resuelto</button>
                    </form>
                    <form action={resolveChangeRequest.bind(null, id, c.id, "rejected")}>
                      <button className="text-xs font-semibold text-danger underline">Descartar</button>
                    </form>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Sin pedidos de cambio.</p>
        )}
        <p className="mt-3 text-xs text-muted">Los cambios que afectan elementos bloqueados o que requieren recalcular alternativas no se aplican automáticamente: se resuelven desde el editor.</p>
      </Panel>
    </div>
  );
}
