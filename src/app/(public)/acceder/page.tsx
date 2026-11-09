import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container, Card } from "@/components/ui";
import { currentClientAccount } from "@/server/auth/client-session";
import { LoginForm } from "./forms";

export const metadata: Metadata = { title: "Acceder a Mi viaje", robots: { index: false, follow: false } };

export default async function AccederPage() {
  if (await currentClientAccount()) redirect("/mi-viaje");
  return (
    <Container className="max-w-md py-12">
      <p className="text-center text-4xl" aria-hidden>
        🧳
      </p>
      <h1 className="mt-2 text-center text-3xl font-semibold">Mi viaje</h1>
      <p className="mt-2 text-center text-muted">Tus reservas, vouchers y el plan día por día, siempre a mano.</p>
      <Card className="mt-6 p-5">
        <LoginForm />
      </Card>
      <p className="mt-4 text-center text-sm text-muted">¿Es tu primera vez? Usá el enlace que te mandó tu asesor para elegir tu contraseña.</p>
    </Container>
  );
}
