import Link from "next/link";
import { PageHeader, fmtDateTime, ghostBtn, smallBtn, smallInput } from "@/components/admin/bits";
import { Badge, EmptyState } from "@/components/ui";
import { requireStaff } from "@/server/auth/session";
import { listProjects, statuses } from "@/server/services/admin";

export const metadata = { title: "Proyectos" };

const PRIORITY: Record<string, { label: string; tone: "danger" | "orange" | "neutral" }> = {
  high: { label: "Alta", tone: "danger" },
  normal: { label: "Normal", tone: "neutral" },
  low: { label: "Baja", tone: "neutral" },
};

export default async function ProyectosPage({ searchParams }: PageProps<"/admin/proyectos">) {
  await requireStaff();
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const filters = {
    q: str("q")?.slice(0, 80),
    status: str("estado"),
    priority: str("prioridad"),
    archived: str("archivados") === "1",
    demo: str("demo") === "1",
    sort: (str("orden") as "updated" | "created" | "followup") ?? "updated",
  };
  const [rows, sts] = await Promise.all([listProjects(filters), statuses()]);
  return (
    <>
      <PageHeader title="Proyectos" subtitle={`${rows.length} resultado(s)`} />
      <form className="mb-4 flex flex-wrap items-end gap-2 rounded-2xl border border-line bg-white p-3">
        <input name="q" defaultValue={filters.q} placeholder="Buscar por código, cliente, destino…" className={`${smallInput} min-w-56 flex-1`} aria-label="Buscar" />
        <select name="estado" defaultValue={filters.status ?? ""} className={smallInput} aria-label="Estado">
          <option value="">Todos los estados</option>
          {sts.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
        <select name="prioridad" defaultValue={filters.priority ?? ""} className={smallInput} aria-label="Prioridad">
          <option value="">Toda prioridad</option>
          <option value="high">Alta</option>
          <option value="normal">Normal</option>
          <option value="low">Baja</option>
        </select>
        <select name="orden" defaultValue={filters.sort} className={smallInput} aria-label="Orden">
          <option value="updated">Última modificación</option>
          <option value="created">Fecha de creación</option>
          <option value="followup">Próximo seguimiento</option>
        </select>
        <label className="flex items-center gap-1 text-sm">
          <input type="checkbox" name="archivados" value="1" defaultChecked={filters.archived} /> Archivados
        </label>
        <label className="flex items-center gap-1 text-sm">
          <input type="checkbox" name="demo" value="1" defaultChecked={filters.demo} /> Incluir demo
        </label>
        <button className={smallBtn}>Filtrar</button>
        <Link href="/admin/proyectos" className={ghostBtn}>
          Limpiar
        </Link>
      </form>
      {rows.length === 0 ? (
        <EmptyState title="No hay proyectos con estos filtros">Los proyectos se crean cuando un cliente completa el cuestionario.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-sand text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2">Proyecto</th>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Destino / ruta</th>
                <th className="px-3 py-2">Fechas</th>
                <th className="px-3 py-2">Pax</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Prioridad</th>
                <th className="px-3 py-2">Próxima tarea</th>
                <th className="px-3 py-2">Modificado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map(({ p, clientName, clientEmail, status }) => (
                <tr key={p.id} className="hover:bg-sand/60">
                  <td className="px-3 py-2">
                    <Link href={`/admin/proyectos/${p.id}`} className="font-semibold text-navy hover:underline">
                      {p.code}
                    </Link>
                    {p.isDemo && <Badge tone="warning" className="ml-1">DEMO</Badge>}
                    <p className="max-w-56 truncate text-xs text-muted">{p.name}</p>
                  </td>
                  <td className="px-3 py-2">{clientName ?? <span className="text-muted">Sin contacto</span>}<p className="text-xs text-muted">{clientEmail}</p></td>
                  <td className="max-w-56 px-3 py-2">{p.destinationSummary}</td>
                  <td className="px-3 py-2 text-xs">{p.tentativeDates}</td>
                  <td className="px-3 py-2">{p.travelers}</td>
                  <td className="px-3 py-2"><Badge>{status?.label ?? p.statusKey}</Badge></td>
                  <td className="px-3 py-2"><Badge tone={PRIORITY[p.priority]?.tone}>{PRIORITY[p.priority]?.label ?? p.priority}</Badge></td>
                  <td className="max-w-48 truncate px-3 py-2 text-xs">{p.nextTask ?? "—"}{p.nextFollowUp && <p className="text-muted">Seguimiento: {p.nextFollowUp}</p>}</td>
                  <td className="px-3 py-2 text-xs text-muted">{fmtDateTime(p.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
