import type { Metadata } from "next";
import { Card, Container } from "@/components/ui";
import { ResetForm } from "../forms";

export const metadata: Metadata = { title: "Recuperar contraseña", robots: { index: false, follow: false } };

export default function RecuperarPage() {
  return (
    <Container className="max-w-md py-12">
      <h1 className="text-center text-3xl font-semibold">Recuperar contraseña</h1>
      <Card className="mt-6 p-5">
        <ResetForm />
      </Card>
    </Container>
  );
}
