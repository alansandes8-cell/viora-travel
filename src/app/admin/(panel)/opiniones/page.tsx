import { PageHeader, Panel, fmtDateTime } from "@/components/admin/bits";
import { Badge, EmptyState } from "@/components/ui";
import { requireStaff } from "@/server/auth/session";
import { allTestimonials } from "@/server/services/leads";
import { agency } from "@/server/settings";
import { setTestimonialStatusAction } from "./actions";
import { AddTestimonialForm } from "./add-form";

export const metadata = { title: "Opiniones" };

const STATUS: Record<string, { label: string; tone: "teal" | "orange" | "neutral" }> = {
  approved: { label: "Publicada", tone: "teal" },
  pending: { label: "Por revisar", tone: "orange" },
  hidden: { label: "Oculta", tone: "neutral" },
};

export default async function OpinionesPage() {
  await requireStaff();
  const rows = await allTestimonials();
  return (
    <>
      <PageHeader
        title="Opiniones de clientes"
        subtitle="Se muestran en la página de inicio solo las publicadas. Usá únicamente opiniones reales: inventarlas es publicidad engañosa y puede traer sanciones."
      />
      <Panel title="Pedile la opinión a tus clientes">
        <p className="text-sm text-muted">
          Mandales este enlace cuando vuelvan del viaje: <a className="font-semibold text-navy underline" href="/opinar">{agency.appUrl()}/opinar</a>. Las que lleguen quedan «Por revisar» hasta que las publiques.
        </p>
      </Panel>
      <Panel title="Cargar una opinión que recibiste (WhatsApp, email, Instagram)" className="mt-6">
        <AddTestimonialForm />
      </Panel>
      <div className="mt-6">
        {rows.length === 0 ? (
          <EmptyState title="Todavía no hay opiniones">Mientras no haya opiniones publicadas, la sección no aparece en la web.</EmptyState>
        ) : (
          <ul className="space-y-3">
            {rows.map((t) => (
              <li key={t.id} className="rounded-2xl border border-line bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={STATUS[t.status]?.tone ?? "neutral"}>{STATUS[t.status]?.label ?? t.status}</Badge>
                  <span className="font-semibold text-navy">
                    {t.name}
                    {t.city && `, ${t.city}`}
                  </span>
                  <span className="text-sm text-orange-brand">{"★".repeat(t.rating)}</span>
                  <span className="text-xs text-muted">
                    {t.trip} · {fmtDateTime(t.createdAt)} · {t.source === "cliente" ? "enviada por el cliente" : "cargada por la agencia"}
                  </span>
                </div>
                <p className="mt-2 text-sm">{t.text}</p>
                {t.contact && <p className="mt-1 text-xs text-muted">Contacto: {t.contact}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["approved", "hidden"] as const)
                    .filter((s) => s !== t.status)
                    .map((s) => (
                      <form key={s} action={setTestimonialStatusAction.bind(null, t.id, s)}>
                        <button className="min-h-9 rounded-full border border-line px-3 text-sm font-semibold text-navy hover:bg-navy/5">{s === "approved" ? "Publicar" : "Ocultar"}</button>
                      </form>
                    ))}
                  <form action={setTestimonialStatusAction.bind(null, t.id, "delete")}>
                    <button className="min-h-9 rounded-full border border-coral-brand/40 px-3 text-sm font-semibold text-coral-brand hover:bg-coral-brand/5">Eliminar</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
