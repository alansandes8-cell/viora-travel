import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { PageHeader, Panel, fmtDateTime } from "@/components/admin/bits";
import { Badge } from "@/components/ui";
import { requireStaff } from "@/server/auth/session";
import { db, schema } from "@/server/db";
import { anonymizeClient } from "../actions";

export default async function ClientePage({ params }: PageProps<"/admin/clientes/[id]">) {
  const staff = await requireStaff();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const c = await db().query.clients.findFirst({ where: eq(schema.clients.id, id) });
  if (!c) notFound();
  const projects = await db().select().from(schema.tripProjects).where(eq(schema.tripProjects.clientId, id)).orderBy(desc(schema.tripProjects.createdAt));
  const chats = await db().select().from(schema.chatConversations).where(eq(schema.chatConversations.clientId, id)).orderBy(desc(schema.chatConversations.createdAt));
  return (
    <>
      <PageHeader title={c.anonymizedAt ? "Cliente anonimizado" : c.name ?? "Cliente"} subtitle={`Alta ${fmtDateTime(c.createdAt)} · origen: ${c.source}`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Datos de contacto">
          <dl className="space-y-1 text-sm">
            <p>Email: {c.email ?? "—"}</p>
            <p>Teléfono: {c.phone ?? "—"}</p>
            <p>País: {c.country ?? "—"}</p>
            <p>Consentimiento de contacto: {c.consentContact ? `sí (${fmtDateTime(c.consentAt)})` : "no"}</p>
          </dl>
          {staff.role === "owner" && !c.anonymizedAt && (
            <form action={anonymizeClient.bind(null, c.id)} className="mt-4">
              <button className="text-sm font-semibold text-danger underline">Ejercer derecho de supresión (anonimizar datos personales)</button>
            </form>
          )}
        </Panel>
        <Panel title="Viajes asociados">
          <ul className="space-y-2 text-sm">
            {projects.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2">
                <Link href={`/admin/proyectos/${p.id}`} className="font-semibold text-navy hover:underline">
                  {p.code}
                </Link>
                <span>{p.destinationSummary}</span>
                <Badge>{p.statusKey}</Badge>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">Las preferencias de viajes anteriores pueden reutilizarse para nuevas propuestas con autorización del cliente.</p>
        </Panel>
        {chats.length > 0 && (
          <Panel title="Conversación con Viorita" className="lg:col-span-2">
            {chats.map((ch) => (
              <div key={ch.id} className="space-y-2 text-sm">
                <p className="text-xs text-muted">
                  Iniciada {fmtDateTime(ch.createdAt)}
                  {ch.page ? ` · desde ${ch.page}` : ""}
                </p>
                {ch.messages.map((m, i) => (
                  <p key={i} className={m.role === "user" ? "rounded-xl bg-teal-brand/10 p-2" : "rounded-xl bg-sand p-2"}>
                    <b>{m.role === "user" ? "Cliente" : "Viorita"}:</b> {m.content}
                  </p>
                ))}
              </div>
            ))}
          </Panel>
        )}
      </div>
    </>
  );
}
