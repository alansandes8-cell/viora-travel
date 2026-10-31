import { notFound } from "next/navigation";
import { PageHeader, Panel } from "@/components/admin/bits";
import { requireStaff } from "@/server/auth/session";
import { packageById } from "@/server/services/packages";
import { loadLibrary } from "@/server/settings";
import { deletePackageAction, savePackageAction } from "../actions";
import { PackageForm } from "../package-form";
import { ConfirmSubmit } from "@/app/(public)/viajes/confirm-submit";

export default async function PaqueteAdminPage({ params }: PageProps<"/admin/paquetes/[id]">) {
  const staff = await requireStaff("agent");
  const { id } = await params;
  const isNew = id === "nuevo";
  const p = isNew ? null : await packageById(id);
  if (!isNew && !p) notFound();
  const destinations = (await loadLibrary()).map((d) => ({ id: d.id, name: d.name })).sort((a, b) => a.name.localeCompare(b.name, "es"));
  return (
    <>
      <PageHeader title={isNew ? "Nuevo paquete" : p!.title} subtitle={isNew ? undefined : `Dirección en la web: /paquetes/${p!.slug}`} />
      <Panel>
        <PackageForm initial={p} destinations={destinations} action={savePackageAction.bind(null, isNew ? null : p!.id)} />
      </Panel>
      {!isNew && staff.role === "owner" && (
        <form action={deletePackageAction.bind(null, p!.id)} className="mt-4">
          <ConfirmSubmit message="¿Eliminar este paquete? Se borra de la web y no se puede deshacer.">Eliminar este paquete</ConfirmSubmit>
        </form>
      )}
    </>
  );
}
