import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { PageHeader, fmtDateTime } from "@/components/admin/bits";
import { EmptyState } from "@/components/ui";
import { requireStaff } from "@/server/auth/session";
import { db, schema } from "@/server/db";

export const metadata = { title: "Clientes" };

export default async function ClientesPage() {
  await requireStaff();
  const rows = await db()
    .select({ c: schema.clients, projects: sql<number>`count(${schema.tripProjects.id})::int` })
    .from(schema.clients)
    .leftJoin(schema.tripProjects, eq(schema.tripProjects.clientId, schema.clients.id))
    .groupBy(schema.clients.id)
    .orderBy(desc(schema.clients.createdAt))
    .limit(300);
  return (
    <>
      <PageHeader title="Clientes" subtitle="Solo los datos que cada persona decidió compartir." />
      {rows.length === 0 ? (
        <EmptyState title="Todavía no hay clientes">Se crean cuando alguien pide una cotización o cuando los cargás desde un proyecto.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-sand text-left text-xs uppercase text-muted">
              <tr>
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">Contacto</th>
                <th className="px-3 py-2">Viajes</th>
                <th className="px-3 py-2">Consentimiento</th>
                <th className="px-3 py-2">Alta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map(({ c, projects }) => (
                <tr key={c.id}>
                  <td className="px-3 py-2">
                    <Link href={`/admin/clientes/${c.id}`} className="font-semibold text-navy hover:underline">
                      {c.anonymizedAt ? "Anonimizado" : c.name ?? "Sin nombre"}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-xs">{c.email} {c.phone}</td>
                  <td className="px-3 py-2">{projects}</td>
                  <td className="px-3 py-2 text-xs">{c.consentContact ? `Sí · ${fmtDateTime(c.consentAt)}` : "No"}</td>
                  <td className="px-3 py-2 text-xs text-muted">{fmtDateTime(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
