import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MessageCircle } from "lucide-react";
import type { ClientProposal } from "@/core/sanitize";
import { whatsappSummary } from "@/core/summary";
import { ProposalReport } from "@/components/proposal/proposal-report";
import { Container } from "@/components/ui";
import { whatsappLink } from "@/server/integrations/notify";
import { proposalMedia } from "@/server/proposal-media";
import { agency } from "@/server/settings";
import { resolveShareLink } from "@/server/services/projects";

export const metadata: Metadata = { title: "Propuesta de viaje", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function SharedProposalPage({ params }: PageProps<"/p/[token]">) {
  const { token } = await params;
  const link = await resolveShareLink(token);
  if (!link || link.kind !== "client_proposal") notFound();
  const proposal = link.content as ClientProposal;
  const media = await proposalMedia(proposal);
  const wa = agency.whatsapp();
  return (
    <Container className="py-10">
      <div className="mb-6 flex flex-wrap justify-end gap-2 no-print">
        <a href={`/p/${token}/pdf`} className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-navy">
          Descargar PDF
        </a>
      </div>
      <ProposalReport
        proposal={proposal}
        media={media}
        footer={
          wa ? (
            <a href={whatsappLink(wa, `Hola VIORA TRAVEL, vi esta propuesta y quiero avanzar:\n\n${whatsappSummary(proposal)}`)} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-navy no-print">
              <MessageCircle className="h-4 w-4" aria-hidden /> Quiero una propuesta personalizada
            </a>
          ) : null
        }
      />
      <p className="mt-6 text-center text-xs text-muted">Enlace privado · vence el {link.expiresAt.toLocaleDateString("es-AR")}</p>
    </Container>
  );
}
