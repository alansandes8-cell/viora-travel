import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { PageHeader } from "@/components/admin/bits";
import { requireStaff } from "@/server/auth/session";
import { db, schema } from "@/server/db";
import { DestinationEditor } from "./editor";

export default async function DestinoPage({ params }: PageProps<"/admin/biblioteca/[id]">) {
  const staff = await requireStaff();
  const { id } = await params;
  const row = await db().query.destinations.findFirst({ where: eq(schema.destinations.id, id) });
  if (!row) notFound();
  return (
    <>
      <PageHeader title={`Destino: ${(row.data as { name: string }).name}`} subtitle="Edición avanzada en formato JSON (se valida antes de guardar)." />
      <DestinationEditor id={id} json={JSON.stringify(row.data, null, 2)} canEdit={staff.role !== "viewer"} />
    </>
  );
}
