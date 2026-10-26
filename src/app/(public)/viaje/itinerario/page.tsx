import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ChangeBox } from "@/components/proposal/change-box";
import { ItineraryView } from "@/components/proposal/itinerary-view";
import { ButtonLink, Card, Container } from "@/components/ui";
import { proposalMedia } from "@/server/proposal-media";
import { currentProposal } from "@/server/services/client-flow";
import { requestChangeAction } from "../actions";

export const metadata: Metadata = { title: "Tu itinerario" };

export default async function ItinerarioPage() {
  const data = await currentProposal();
  if (!data) return null;
  const p = data.proposal;
  const alt = p.alternatives.find((a) => a.id === p.selectedAlternativeId);
  const media = await proposalMedia(p);
  return (
    <Container className="py-10">
      {alt && (
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-teal-brand">Alternativa elegida</p>
            <h2 className="text-2xl font-semibold">{alt.title}</h2>
            <p className="mt-1 max-w-2xl text-muted">{alt.summary}</p>
          </div>
          <Link href="/viaje" className="text-sm font-semibold text-navy underline underline-offset-4">
            Cambiar de alternativa
          </Link>
        </div>
      )}
      <ItineraryView proposal={p} {...media} />
      <Card className="mt-12 p-5 sm:p-6">
        <h2 className="text-xl font-semibold">¿Querés ajustar algo?</h2>
        <p className="mt-1 text-sm text-muted">Pedí el cambio con tus palabras. Recalculamos solo lo necesario y conservamos el resto de tu viaje.</p>
        <div className="mt-4">
          <ChangeBox action={requestChangeAction} />
        </div>
      </Card>
      <div className="mt-10 rounded-[2rem] bg-navy p-8 text-white sm:p-10">
        <h2 className="text-2xl font-semibold text-white sm:text-3xl">¿Lo hacemos realidad?</h2>
        <p className="mt-2 max-w-2xl text-white/80">Un asesor de VIORA revisa tu propuesta, verifica vuelos, alojamientos y disponibilidad, y te prepara una cotización personalizada.</p>
        <ButtonLink href="/viaje/solicitar" variant="secondary" className="mt-6">
          Solicitar mi propuesta personalizada <ArrowRight className="h-4 w-4" aria-hidden />
        </ButtonLink>
      </div>
    </Container>
  );
}
