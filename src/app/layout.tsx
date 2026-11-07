import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito_Sans } from "next/font/google";
import { PwaSetup } from "@/components/pwa/pwa";
import "./globals.css";

const fredoka = Fredoka({ variable: "--font-fredoka", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const nunito = Nunito_Sans({ variable: "--font-nunito-sans", subsets: ["latin"] });

// Se calcula al atender cada pedido (APP_URL existe en el servidor, no al compilar la imagen).
export async function generateMetadata(): Promise<Metadata> {
  const site = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return { metadataBase: new URL(site), ...BASE_METADATA };
}

const BASE_METADATA: Metadata = {
  title: { default: "VIORA TRAVEL — Agencia de viajes: paquetes, vuelos y viajes a medida", template: "%s · VIORA TRAVEL" },
  description:
    "Agencia de viajes argentina. Paquetes turísticos, vuelos, hoteles y excursiones con precios estimados al instante y asesores reales. Disney, Europa, Caribe, Brasil y más: armá tu viaje a medida.",
  keywords: ["agencia de viajes", "paquetes turísticos", "viajes desde Argentina", "vuelos", "Disney", "Europa", "Caribe", "viajes a medida"],
  openGraph: { type: "website", locale: "es_AR", siteName: "VIORA TRAVEL" },
  twitter: { card: "summary_large_image" },
  ...(process.env.GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } } : {}),
  applicationName: "VIORA TRAVEL",
  manifest: "/manifest.webmanifest",
  // El ícono de la pestaña sale de app/favicon.ico y app/icon.png (la «V» del logo).
  icons: { apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "VIORA", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#fbf8f3",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={`${fredoka.variable} ${nunito.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <PwaSetup />
        {children}
      </body>
    </html>
  );
}
