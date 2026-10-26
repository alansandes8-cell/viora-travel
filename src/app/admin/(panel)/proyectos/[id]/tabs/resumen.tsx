import { Panel, fmtDateTime, smallBtn, smallInput } from "@/components/admin/bits";
import { Badge } from "@/components/ui";
import { MONTHS_ES } from "@/core/catalog";
import type { PlanDocument } from "@/core/types";
import { toggleArchive, updateClient, updateProjectMeta } from "../actions";
import type { Bundle } from "./types";

export function TabResumen({ b, doc, statuses, canEdit }: { b: Bundle; doc: PlanDocument; statuses: { key: string; label: string }[]; canEdit: boolean }) {
  const p = b.project;
  const answers = b.intake?.answers;
  const alt = doc.alternatives.find((a) => a.id === doc.selectedAlternativeId);
  const errors = doc.checks.filter((c) => c.severity === "error");
  const warnings = doc.checks.filter((c) => c.severity === "warning");
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <div className="space-y-6 xl:col-span-2">
        <Panel title="Resumen ejecutivo">
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <Item label="Objetivo del viaje">{doc.concept}</Item>
            <Item label="Perfil">{doc.profile.declared.map((d) => `${d.label}: ${d.value}`).join(" · ")}</Item>
            <Item label="Fechas">{p.tentativeDates ?? "—"}{doc.profile.exploratory && " (no confirmadas)"}</Item>
            <Item label="Flexibilidad">{doc.profile.flexibleDays ? `± ${doc.profile.flexibleDays} días` : "Fechas fijas"}</Item>
            <Item label="Viajeros">{doc.profile.travelers} ({doc.profile.partyType}){doc.profile.kids.length ? ` · menores: ${doc.profile.kids.join(", ")} años` : ""}</Item>
            <Item label="Origen">{doc.profile.originLabel} {doc.profile.originAirports.join("/")}</Item>
            <Item label="Prioridades">{doc.profile.priorities.length ? doc.profile.priorities.join(", ") : "—"}{doc.profile.mustHave.length ? ` · indispensables: ${doc.profile.mustHave.join(", ")}` : ""}</Item>
            <Item label="Restricciones">{[doc.profile.reducedMobility && "movilidad reducida", doc.profile.noCar && "sin auto", doc.profile.avoidHotelChanges && "pocos cambios de hotel", doc.profile.excludedIds.length && `excluye: ${doc.profile.excludedIds.join(", ")}`].filter(Boolean).join(" · ") || "—"}</Item>
            <Item label="Presupuesto orientativo (interno)">
              Nivel {doc.profile.budgetTier}
              {b.budget?.amount ? ` · ${b.budget.currency} ${Number(b.budget.amount).toLocaleString("es-AR")} ${b.budget.per === "person" ? "por persona" : "por grupo"}` : " · sin monto declarado"}
              {b.budget?.flexibility ? ` · flexibilidad: ${b.budget.flexibility}` : ""}
              {b.budget?.includes && Object.keys(b.budget.includes).length ? ` · incluye: ${Object.entries(b.budget.includes as Record<string, boolean>).filter(([, v]) => v).map(([k]) => k).join(", ")}` : ""}
            </Item>
            <Item label="Alternativa elegida">{alt ? `${alt.title} (${alt.compatibility}/100)` : "—"}</Item>
            <Item label="Época">{doc.profile.months.map((m) => MONTHS_ES[m - 1]).join(", ") || "—"}</Item>
            <Item label="Motor">{doc.engine.kind === "rules+ai" ? `Reglas + IA (${doc.engine.model})` : "Motor determinista (sin IA)"}</Item>
          </dl>
          {answers?.dreamText && (
            <blockquote className="mt-4 rounded-xl bg-sand p-3 text-sm italic text-navy">«{answers.dreamText}»</blockquote>
          )}
        </Panel>
        <Panel title="Control de coherencia">
          {errors.length + warnings.length === 0 ? (
            <p className="text-sm text-success">Sin errores ni advertencias en las validaciones deterministas.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {[...errors, ...warnings].map((c, i) => (
                <li key={i} className="flex gap-2">
                  <Badge tone={c.severity === "error" ? "danger" : "warning"}>{c.severity === "error" ? "Error" : "Advertencia"}</Badge> {c.message}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">Información pendiente de confirmar</p>
          <ul className="mt-1 list-disc pl-5 text-sm">
            {doc.pendingInfo.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </Panel>
        <Panel title="Solicitudes de cotización">
          {b.requests.length ? (
            <ul className="divide-y divide-line text-sm">
              {b.requests.map((r) => (
                <li key={r.id} className="py-2">
                  <p className="font-semibold text-navy">
                    {r.name} · {r.preferredChannel} · {fmtDateTime(r.createdAt)}
                  </p>
                  <p className="text-muted">
                    {r.email ?? ""} {r.phone ?? ""} {r.message ? `· «${r.message}»` : ""}
                  </p>
                  <p className="text-xs text-muted">Aviso a la agencia: {r.notificationStatus === "sent" ? "email enviado" : r.notificationStatus === "failed" ? `falló (${r.notificationError ?? ""})` : "email no configurado (solo registrado en el panel)"}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">El cliente todavía no pidió cotización.</p>
          )}
        </Panel>
      </div>
      <div className="space-y-6">
        <Panel title="Seguimiento comercial">
          <form action={updateProjectMeta.bind(null, p.id)} className="space-y-3 text-sm">
            <label className="block">
              <span className="text-xs font-semibold text-muted">Nombre del proyecto</span>
              <input name="name" defaultValue={p.name} className={`${smallInput} w-full`} disabled={!canEdit} />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-muted">Estado</span>
              <select name="statusKey" defaultValue={p.statusKey} className={`${smallInput} w-full`} disabled={!canEdit}>
                {statuses.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-muted">Prioridad comercial</span>
              <select name="priority" defaultValue={p.priority} className={`${smallInput} w-full`} disabled={!canEdit}>
                <option value="high">Alta</option>
                <option value="normal">Normal</option>
                <option value="low">Baja</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-muted">Próxima tarea</span>
              <input name="nextTask" defaultValue={p.nextTask ?? ""} className={`${smallInput} w-full`} disabled={!canEdit} />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-muted">Fecha de seguimiento</span>
              <input type="date" name="nextFollowUp" defaultValue={p.nextFollowUp ?? ""} className={`${smallInput} w-full`} disabled={!canEdit} />
            </label>
            {canEdit && <button className={smallBtn}>Guardar</button>}
          </form>
        </Panel>
        <Panel title="Cliente">
          <form action={updateClient.bind(null, p.id)} className="space-y-2 text-sm">
            <input name="name" placeholder="Nombre" defaultValue={b.client?.name ?? ""} className={`${smallInput} w-full`} disabled={!canEdit} />
            <input name="email" placeholder="Email" defaultValue={b.client?.email ?? ""} className={`${smallInput} w-full`} disabled={!canEdit} />
            <input name="phone" placeholder="Teléfono" defaultValue={b.client?.phone ?? ""} className={`${smallInput} w-full`} disabled={!canEdit} />
            <input name="country" placeholder="País" defaultValue={b.client?.country ?? ""} className={`${smallInput} w-full`} disabled={!canEdit} />
            {b.client && <p className="text-xs text-muted">Consentimiento de contacto: {b.client.consentContact ? `sí (${fmtDateTime(b.client.consentAt)})` : "no registrado"}</p>}
            {canEdit && <button className={smallBtn}>Guardar cliente</button>}
          </form>
        </Panel>
        {canEdit && (
          <form action={toggleArchive.bind(null, p.id)}>
            <button className="text-sm font-semibold text-danger underline">{p.archivedAt ? "Desarchivar proyecto" : "Archivar proyecto"}</button>
          </form>
        )}
      </div>
    </div>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 text-ink">{children}</dd>
    </div>
  );
}
