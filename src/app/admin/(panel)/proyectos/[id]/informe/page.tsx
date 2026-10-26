import { notFound } from "next/navigation";
import { InternalReport } from "@/components/admin/internal-report";
import { requireStaff } from "@/server/auth/session";
import { projectBundle } from "@/server/services/admin";

export default async function InformePage({ params }: PageProps<"/admin/proyectos/[id]/informe">) {
  await requireStaff();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const b = await projectBundle(id);
  if (!b?.current) notFound();
  return (
    <div className="rounded-2xl border border-line">
      <InternalReport b={b} />
    </div>
  );
}
