import QRCode from "qrcode";
import { Card, Container } from "@/components/ui";
import { InstallButton, InstallSteps } from "@/components/pwa/pwa";
import { agency } from "@/server/settings";
import { ShareApp } from "./share-app";

// El enlace y el QR dependen de APP_URL del servidor, no del momento de compilar.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Instalá la app",
  description: "Tené VIORA TRAVEL en tu celular: planificá tu viaje y volvé a tu propuesta con un toque.",
};

export default async function AppPage() {
  const url = agency.appUrl();
  const qr = await QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#1b2a4a", light: "#ffffff" } });
  return (
    <Container className="py-10 sm:py-16">
      <div className="mx-auto grid max-w-4xl items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="" width={88} height={88} className="rounded-3xl shadow-soft" />
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">Llevá VIORA en tu celu</h1>
          <p className="text-lg text-muted">Planificá tu viaje, mirá tus alternativas y tu itinerario día por día con un toque desde la pantalla de inicio. Sin descargar nada de una tienda y sin ocupar casi espacio.</p>
          <div className="flex flex-wrap gap-3">
            <InstallButton />
            <ShareApp url={url} />
          </div>
        </div>
        <Card className="grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-1">
          <div>
            <h2 className="text-lg font-semibold">📱 Android</h2>
            <InstallSteps ios={false} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">🍏 iPhone</h2>
            <InstallSteps ios />
          </div>
        </Card>
      </div>
      <div className="mx-auto mt-12 flex max-w-4xl flex-col items-center gap-3 text-center">
        <div className="w-44 rounded-2xl border border-line bg-white p-3" role="img" aria-label={`Código QR para abrir ${url}`} dangerouslySetInnerHTML={{ __html: qr }} />
        <p className="text-sm text-muted">¿Lo estás viendo en una compu? Escaneá el código con la cámara del celu.</p>
      </div>
    </Container>
  );
}
