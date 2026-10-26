import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import type { ClientProposal } from "@/core/sanitize";
import { ProposalReport } from "@/components/proposal/proposal-report";
import { publicDb, schema } from "@/server/db";
import { proposalMedia } from "@/server/proposal-media";
import { verifySignature } from "@/server/security";
import { AutoPrint } from "../../auto-print";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

/** Versión imprimible del informe del cliente. Requiere firma temporal; lee con el rol público. */
export default async function PrintClientPage({ params, searchParams }: PageProps<"/print/cliente/[snapshotId]">) {
  const { snapshotId } = await params;
  const sp = await searchParams;
  if (!verifySignature(`client:${snapshotId}`, Number(sp.exp), String(sp.sig ?? ""))) notFound();
  if (!/^[0-9a-f-]{36}$/.test(snapshotId)) notFound();
  const snap = await publicDb().query.clientSnapshots.findFirst({ where: eq(schema.clientSnapshots.id, snapshotId) });
  if (!snap || snap.kind !== "client_proposal") notFound();
  const proposal = snap.content as ClientProposal;
  const media = await proposalMedia(proposal, { videos: false });
  return (
    <div className="mx-auto max-w-4xl bg-white p-6">
      {sp.autoprint && <AutoPrint />}
      <ProposalReport proposal={proposal} media={media} printMode />
    </div>
  );
}
