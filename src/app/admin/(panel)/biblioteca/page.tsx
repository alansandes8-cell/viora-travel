import Link from "next/link";
import { asc } from "drizzle-orm";
import { PageHeader, Panel, fmtDateTime, ghostBtn } from "@/components/admin/bits";
import { Badge, Notice } from "@/components/ui";
import { SUPER_REGION } from "@/core/library";
import type { Destination } from "@/core/types";
import { requireStaff } from "@/server/auth/session";
import { db, schema } from "@/server/db";
import { runLinkCheck, toggleDestination } from "./actions";

export const metadata = { title: "Biblioteca de destinos" };

export default async function BibliotecaPage() {
  await requireStaff();
  const rows = await db().select().from(schema.destinations).orderBy(asc(schema.destinations.id));
  const checks = await db().select().from(schema.linkChecks);
  const failed = checks.filter((c) => !c.ok);
  return (
    <>
      <PageHeader
        title="Biblioteca de destinos"
        subtitle={`${rows.length} destinos · base del motor de recomendación`}
        actions={
          <form action={runLinkCheck}>
            <button className={ghostBtn}>Verificar enlaces oficiales</button>
          </form>
        }
      />
      <Notice className="mb-4">
        Los datos de clima, temporadas y niveles de costo son valores aproximados cargados como estimación. Revisalos y ajustalos con fuentes oficiales: los destinos editados por la agencia no se sobrescriben al actualizar la semilla.
      </Notice>
      {checks.length > 0 && (
        <Panel title={`Enlaces verificados: ${checks.length - failed.length} OK · ${failed.length} con problemas`} className="mb-4">
          {failed.length ? (
            <ul className="space-y-1 text-xs">
              {failed.map((f) => (
                <li key={f.url}>
                  {f.statusCode ?? "sin respuesta"} — {f.url} ({fmtDateTime(f.checkedAt)})
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-success">Todos los enlaces respondieron correctamente.</p>
          )}
        </Panel>
      )}
      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="bg-sand text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-3 py-2">Destino</th>
              <th className="px-3 py-2">Región</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Noches (mín/ideal/máx)</th>
              <th className="px-3 py-2">Costo</th>
              <th className="px-3 py-2">Actividades</th>
              <th className="px-3 py-2">Origen</th>
              <th className="px-3 py-2">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => {
              const d = r.data as Destination;
              return (
                <tr key={r.id}>
                  <td className="px-3 py-2">
                    <Link href={`/admin/biblioteca/${r.id}`} className="font-semibold text-navy hover:underline">
                      {d.name}
                    </Link>
                    <p className="text-xs text-muted">{d.country}</p>
                  </td>
                  <td className="px-3 py-2 text-xs">{SUPER_REGION[d.cluster]} · {d.cluster}</td>
                  <td className="px-3 py-2">{d.kind}</td>
                  <td className="px-3 py-2">{d.nights.min}/{d.nights.ideal}/{d.nights.max}</td>
                  <td className="px-3 py-2">{"●".repeat(d.costLevel)}</td>
                  <td className="px-3 py-2">{d.highlights.length}</td>
                  <td className="px-3 py-2">
                    <Badge tone={r.source === "agent" ? "purple" : "neutral"}>{r.source === "agent" ? "Editado" : "Semilla"}</Badge>
                  </td>
                  <td className="px-3 py-2">
                    <form action={toggleDestination.bind(null, r.id)}>
                      <button className="text-xs font-semibold underline">{r.active ? "Activo · desactivar" : "Inactivo · activar"}</button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
