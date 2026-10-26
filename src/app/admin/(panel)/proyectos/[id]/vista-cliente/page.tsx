import { notFound } from "next/navigation";
import { desc, and, eq } from "drizzle-orm";
import type { ClientProposal } from "@/core/sanitize";
import { ProposalReport } from "@/components/proposal/proposal-report";
import { Notice } from "@/components/ui";
import { requireStaff } from "@/server/auth/session";
import { db, schema } from "@/server/db";
import { proposalMedia } from "@/server/proposal-media";

export default async function VistaClientePage({ params }: PageProps<"/admin/proyectos/[id]/vista-cliente">) {
  await requireStaff();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const snap = await db().query.clientSnapshots.findFirst({ where: and(eq(schema.clientSnapshots.projectId, id), eq(schema.clientSnapshots.kind, "client_proposal")), orderBy: desc(schema.clientSnapshots.createdAt) });
  if (!snap) return <Notice>No hay una propuesta publicada.</Notice>;
  const p = snap.content as ClientProposal;
  return (
    <div className="max-w-5xl">
      <Notice className="mb-6">Vista previa: es exactamente la instantánea que ve el cliente (generada el {snap.createdAt.toLocaleString("es-AR")}).</Notice>
      <ProposalReport proposal={p} media={await proposalMedia(p)} />
    </div>
  );
}
