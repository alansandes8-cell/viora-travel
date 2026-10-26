import type { Metadata } from "next";
import { Card, Container } from "@/components/ui";
import { agency } from "@/server/settings";
import { whatsappLink } from "@/server/integrations/notify";
import { currentProposal } from "@/server/services/client-flow";
import { whatsappSummary } from "@/core/summary";
import { requestQuoteAction, resumeLinkAction, shareAction } from "../actions";
import { QuoteForm } from "./quote-form";
import { ShareTools } from "./share-tools";

export const metadata: Metadata = { title: "Compartir y cotizar" };

export default async function SolicitarPage() {
  const data = await currentProposal();
  if (!data) return null;
  const summary = whatsappSummary(data.proposal);
  const wa = agency.whatsapp();
  return (
    <Container className="grid gap-8 py-10 lg:grid-cols-[1.2fr_1fr]">
      <Card className="p-6 sm:p-8">
        <h2 className="text-2xl font-semibold">Pedí tu propuesta personalizada</h2>
        <p className="mt-2 text-muted">Dejanos cómo contactarte. Un asesor de VIORA TRAVEL revisa tu viaje y te escribe para avanzar con la cotización real. Sin compromiso.</p>
        <div className="mt-6">
          <QuoteForm action={requestQuoteAction} whatsappHref={wa ? whatsappLink(wa, `Hola VIORA TRAVEL, quiero avanzar con este viaje:\n\n${summary}`) : null} />
        </div>
      </Card>
      <div className="space-y-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold">Guardar y compartir</h2>
          <p className="mt-1 text-sm text-muted">Generá un enlace privado de solo lectura para compartir tu propuesta, descargala en PDF o seguí desde otro dispositivo.</p>
          <div className="mt-4">
            <ShareTools shareAction={shareAction} resumeAction={resumeLinkAction} summary={summary} />
          </div>
        </Card>
      </div>
    </Container>
  );
}
