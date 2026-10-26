import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito_Sans } from "next/font/google";
import "./globals.css";

const fredoka = Fredoka({ variable: "--font-fredoka", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const nunito = Nunito_Sans({ variable: "--font-nunito-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "VIORA TRAVEL — Diseñá el viaje que soñás", template: "%s · VIORA TRAVEL" },
  description: "Contanos cómo imaginás tu viaje y te ayudamos a convertirlo en una propuesta personalizada, con el acompañamiento de asesores de VIORA TRAVEL.",
  icons: { icon: "/brand/viora-logo.webp" },
};

export const viewport: Viewport = {
  themeColor: "#fbf8f3",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={`${fredoka.variable} ${nunito.variable} h-full`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
