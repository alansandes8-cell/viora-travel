import type { ReactNode } from "react";
import { cx } from "@/components/ui";

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, children, className, actions }: { title?: ReactNode; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={cx("rounded-2xl border border-line bg-white p-4 sm:p-5", className)}>
      {(title || actions) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, tone = "navy" }: { label: string; value: ReactNode; tone?: "navy" | "teal" | "orange" | "coral" | "purple" | "cyan" }) {
  const colors: Record<string, string> = { navy: "text-navy", teal: "text-teal-brand", orange: "text-orange-brand", coral: "text-coral-brand", purple: "text-purple-brand", cyan: "text-cyan-brand" };
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className={cx("mt-1 font-display text-3xl", colors[tone])}>{value}</p>
    </div>
  );
}

export const smallInput = "rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm focus:border-cyan-brand focus:outline-none focus:ring-2 focus:ring-cyan-brand/20";
export const smallBtn = "inline-flex items-center gap-1.5 rounded-lg bg-navy px-3 py-1.5 text-sm font-semibold text-white hover:bg-navy/90 disabled:opacity-50";
export const ghostBtn = "inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold text-navy hover:border-navy/30";

export function fmtDateTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" });
}

export const ACTION_LABELS: Record<string, string> = {
  "proposal.generated": "Propuesta generada",
  "proposal.regenerated": "Propuesta regenerada",
  "client.alternative_selected": "El cliente eligió alternativa",
  "client.change_requested": "Pedido de cambio del cliente",
  "client.change_applied": "Cambio aplicado (cliente)",
  "client.quote_requested": "Solicitud de cotización",
  "share_link.created": "Enlace compartido creado",
  "share_link.revoked": "Enlace revocado",
  "plan.edited": "Edición del agente",
  "plan.published": "Propuesta publicada",
  "plan.restored": "Versión restaurada",
  "project.updated": "Proyecto actualizado",
  "staff.login": "Ingreso al panel",
  "staff.login_failed": "Ingreso fallido",
  "quote.updated": "Presupuesto actualizado",
  "quote.priced_published": "Propuesta comercial publicada",
  "ai.review": "Revisión crítica con IA",
  "ai.research": "Investigación con IA",
};
