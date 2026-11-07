import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { PageHeader, fmtDateTime } from "@/components/admin/bits";
import { Badge, EmptyState } from "@/components/ui";
import { requireStaff } from "@/server/auth/session";
import { whatsappLink } from "@/server/integrations/notify";
import { LEAD_KINDS, LEAD_STATUS, listQuoteLeads } from "@/server/services/leads";
import { setLeadStatusAction } from "./actions";

export const metadata = { title: "Consultas" };

const TONE: Record<string, "coral" | "orange" | "teal" | "neutral"> = { new: "coral", contacted: "orange", quoted: "teal", closed: "neutral" };

export default async function ConsultasPage({ searchParams }: PageProps<"/admin/consultas">) {
  await requireStaff();
  const sp = await searchParams;
  const filter = typeof sp.estado === "string" && sp.estado in LEAD_STATUS ? sp.estado : "";
  const all = await listQuoteLeads();
  const rows = filter ? all.filter((r) => r.l.status === filter) : all;
  return (
    <>
      <PageHeader title="Consultas y pedidos de cotización" subtitle="Lo que piden desde el buscador de vuelos, hoteles, actividades, paquetes y desde Viorita. Los precios que vio la persona son estimados." />
      <nav className="mb-4 flex flex-wrap gap-2 text-sm" aria-label="Filtrar por estado">
        <Link href="/admin/consultas" className={`rounded-full border px-3 py-1.5 font-semibold ${!filter ? "border-navy bg-navy text-white" : "border-line bg-white text-navy"}`}>
          Todas ({all.length})
        </Link>
        {Object.entries(LEAD_STATUS).map(([k, label]) => (
          <Link key={k} href={`/admin/consultas?estado=${k}`} className={`rounded-full border px-3 py-1.5 font-semibold ${filter === k ? "border-navy bg-navy text-white" : "border-line bg-white text-navy"}`}>
            {label} ({all.filter((r) => r.l.status === k).length})
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <EmptyState title="Sin consultas por ahora">Cuando alguien pida una cotización desde la web, aparece acá y te llega un email (si está configurado).</EmptyState>
      ) : (
        <ul className="space-y-3">
          {rows.map(({ l, client }) => {
            const phone = client?.phone?.replace(/\D/g, "");
            const first = (client?.name ?? "").split(" ")[0];
            return (
              <li key={l.id} className="rounded-2xl border border-line bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <Badge tone={TONE[l.status] ?? "neutral"}>{LEAD_STATUS[l.status] ?? l.status}</Badge>
                      <span className="text-xs font-bold uppercase text-muted">{LEAD_KINDS[l.kind] ?? l.kind}</span>
                      <span className="text-xs text-muted">{fmtDateTime(l.createdAt)}</span>
                    </p>
                    <p className="mt-1 font-semibold text-navy">{l.summary}</p>
                    {l.message && <p className="mt-1 text-sm text-muted">«{l.message}»</p>}
                    <p className="mt-1 text-sm">
                      {client ? (
                        <Link href={`/admin/clientes/${client.id}`} className="font-semibold text-navy hover:underline">
                          {client.name}
                        </Link>
                      ) : (
                        "Cliente eliminado"
                      )}{" "}
                      <span className="text-muted">
                        {client?.phone} {client?.email}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {phone && (
                      <a
                        href={whatsappLink(phone, `¡Hola ${first}! Te escribo de VIORA TRAVEL por tu consulta: ${l.summary}`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[#1f9d55] px-3 text-sm font-semibold text-white"
                      >
                        <MessageCircle className="h-4 w-4" aria-hidden /> WhatsApp
                      </a>
                    )}
                    {Object.entries(LEAD_STATUS)
                      .filter(([k]) => k !== l.status)
                      .map(([k, label]) => (
                        <form key={k} action={setLeadStatusAction.bind(null, l.id, k)}>
                          <button className="min-h-9 rounded-full border border-line px-3 text-sm font-semibold text-navy hover:bg-navy/5">{label}</button>
                        </form>
                      ))}
                  </div>
                </div>
                {Object.keys(l.details ?? {}).length > 0 && (
                  <details className="mt-2 text-xs text-muted">
                    <summary className="cursor-pointer">Detalle del pedido</summary>
                    <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded-lg bg-sand p-2">{JSON.stringify(l.details, null, 2)}</pre>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
