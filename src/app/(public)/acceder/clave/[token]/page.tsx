import type { Metadata } from "next";
import Link from "next/link";
import { Card, Container } from "@/components/ui";
import { tokenInfo } from "@/server/auth/client-session";
import { SetPasswordForm } from "../../forms";

export const metadata: Metadata = { title: "Elegí tu contraseña", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function ClavePage({ params }: PageProps<"/acceder/clave/[token]">) {
  const { token } = await params;
  const info = await tokenInfo(token);
  return (
    <Container className="max-w-md py-12">
      {info ? (
        <>
          <p className="text-center text-4xl" aria-hidden>
            🎉
          </p>
          <h1 className="mt-2 text-center text-3xl font-semibold">{info.purpose === "activate" ? "¡Bienvenido a Mi viaje!" : "Nueva contraseña"}</h1>
          <p className="mt-2 text-center text-muted">
            Tu usuario es <strong className="text-navy">{info.email}</strong>. Elegí una contraseña para entrar cuando quieras.
          </p>
          <Card className="mt-6 p-5">
            <SetPasswordForm token={token} />
          </Card>
        </>
      ) : (
        <>
          <h1 className="text-center text-2xl font-semibold">El enlace venció o ya se usó</h1>
          <p className="mt-2 text-center text-muted">Pedile uno nuevo a tu asesor, o si ya elegiste tu contraseña, entrá directamente.</p>
          <p className="mt-6 text-center">
            <Link href="/acceder" className="font-semibold text-navy underline">
              Ir a Acceder
            </Link>
          </p>
        </>
      )}
    </Container>
  );
}
