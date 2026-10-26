import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, fmtDateTime } from "@/components/admin/bits";
import { Badge, cx } from "@/components/ui";
import { requireStaff } from "@/server/auth/session";
import { projectBundle, statuses } from "@/server/services/admin";
import { loadLibrary } from "@/server/settings";
import { aiConfigured } from "@/server/ai/claude";
import { publishCurrent } from "./actions";
import { TabResumen } from "./tabs/resumen";
import { TabPerfil } from "./tabs/perfil";
import { TabAlternativas } from "./tabs/alternativas";
import { TabItinerario } from "./tabs/itinerario";
import { TabLogistica } from "./tabs/logistica";
import { TabCotizar } from "./tabs/cotizar";
import { TabPresupuesto } from "./tabs/presupuesto";
import { TabTareas } from "./tabs/tareas";
import { TabVersiones } from "./tabs/versiones";
import { TabCompartir } from "./tabs/compartir";
import { TabInformes } from "./tabs/informes";

const TABS = [
  ["resumen", "Resumen"],
  ["perfil", "Perfil"],
  ["alternativas", "Alternativas"],
  ["itinerario", "Itinerario"],
  ["logistica", "Logística y verificación"],
  ["cotizar", "Componentes a cotizar"],
  ["presupuesto", "Presupuesto"],
  ["tareas", "Tareas y notas"],
  ["versiones", "Versiones"],
  ["compartir", "Compartir"],
  ["informes", "Informes"],
] as const;

export default async function ProjectPage({ params, searchParams }: PageProps<"/admin/proyectos/[id]">) {
  const staff = await requireStaff();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const sp = await searchParams;
  const tab = (typeof sp.tab === "string" && TABS.some(([k]) => k === sp.tab) ? sp.tab : "resumen") as (typeof TABS)[number][0];
  const [b, sts, library] = await Promise.all([projectBundle(id), statuses(), loadLibrary()]);
  if (!b) notFound();
  const doc = b.current?.document;
  const canEdit = staff.role !== "viewer";
  const unpublished = b.project.currentVersionId !== b.project.publishedVersionId;
  const status = sts.find((s) => s.key === b.project.statusKey);
  const pendingChanges = b.changes.filter((c) => c.status === "pending_approval" || c.status === "unmatched").length;

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {b.project.code}
            <Badge>{status?.label ?? b.project.statusKey}</Badge>
            {b.project.isDemo && <Badge tone="warning">DATOS DE DEMOSTRACIÓN</Badge>}
            {b.project.archivedAt && <Badge tone="danger">Archivado</Badge>}
          </span>
        }
        subtitle={
          <>
            {b.project.name} · creado {fmtDateTime(b.project.createdAt)} · modificado {fmtDateTime(b.project.updatedAt)}
          </>
        }
        actions={
          canEdit && unpublished && doc ? (
            <form action={publishCurrent.bind(null, id)}>
              <button className="rounded-full bg-teal-brand px-4 py-2 text-sm font-semibold text-white hover:bg-teal-brand/90">Aprobar y publicar versión {b.current?.number} para el cliente</button>
            </form>
          ) : (
            <Badge tone="success">El cliente ve la versión {b.versions.find((v) => v.id === b.project.publishedVersionId)?.number ?? "—"}</Badge>
          )
        }
      />
      {pendingChanges > 0 && (
        <p className="mb-4 rounded-xl border border-orange-brand/40 bg-orange-brand/10 px-4 py-2 text-sm text-navy">
          Hay {pendingChanges} pedido(s) de cambio del cliente pendiente(s) de revisión.{" "}
          <Link href={`?tab=versiones`} className="font-semibold underline">
            Ver
          </Link>
        </p>
      )}
      <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-line scrollbar-none" aria-label="Secciones del proyecto">
        {TABS.map(([k, label]) => (
          <Link key={k} href={`?tab=${k}`} className={cx("shrink-0 border-b-2 px-3 py-2 text-sm font-semibold", tab === k ? "border-teal-brand text-navy" : "border-transparent text-muted hover:text-navy")}>
            {label}
          </Link>
        ))}
      </nav>
      {!doc ? (
        <p className="text-muted">Este proyecto todavía no tiene un plan.</p>
      ) : (
        <>
          {tab === "resumen" && <TabResumen b={b} doc={doc} statuses={sts} canEdit={canEdit} />}
          {tab === "perfil" && <TabPerfil b={b} doc={doc} />}
          {tab === "alternativas" && <TabAlternativas id={id} doc={doc} canEdit={canEdit} library={library} />}
          {tab === "itinerario" && <TabItinerario id={id} doc={doc} canEdit={canEdit} library={library} />}
          {tab === "logistica" && <TabLogistica id={id} doc={doc} canEdit={canEdit} />}
          {tab === "cotizar" && <TabCotizar id={id} b={b} canEdit={canEdit} />}
          {tab === "presupuesto" && <TabPresupuesto id={id} b={b} canEdit={canEdit} />}
          {tab === "tareas" && <TabTareas id={id} b={b} canEdit={canEdit} ai={aiConfigured()} />}
          {tab === "versiones" && <TabVersiones id={id} b={b} canEdit={canEdit} />}
          {tab === "compartir" && <TabCompartir id={id} b={b} canEdit={canEdit} />}
          {tab === "informes" && <TabInformes id={id} />}
        </>
      )}
    </>
  );
}
