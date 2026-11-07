import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { OpinarForm } from "./form";

export const metadata: Metadata = { title: "Contanos tu viaje", robots: { index: false } };

export default function OpinarPage() {
  return (
    <Container className="max-w-2xl py-10">
      <p className="text-sm font-bold uppercase tracking-wider text-coral-brand">Tu opinión</p>
      <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">¿Cómo te fue en el viaje?</h1>
      <p className="mt-2 text-muted">Nos encantaría saberlo. Tu comentario ayuda a otras personas a animarse a viajar con nosotros.</p>
      <div className="mt-6">
        <OpinarForm />
      </div>
    </Container>
  );
}
