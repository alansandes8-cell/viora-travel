import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Container, Logo } from "@/components/ui";
import { agency } from "@/server/settings";
import { whatsappLink } from "@/server/integrations/notify";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const wa = agency.whatsapp();
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line/70 bg-white/90 backdrop-blur no-print">
        <Container className="flex h-16 items-center justify-between gap-4">
          <Link href="/" aria-label="VIORA TRAVEL, inicio" className="flex items-center">
            <Logo size={136} className="w-[120px] sm:w-[136px]" />
          </Link>
          <nav className="flex items-center gap-1 text-sm font-semibold text-navy sm:gap-3">
            <Link href="/#como-funciona" className="hidden rounded-full px-3 py-2 hover:bg-navy/5 sm:inline">
              Cómo funciona
            </Link>
            <Link href="/viajes" className="rounded-full px-3 py-2 hover:bg-navy/5">
              Mis viajes
            </Link>
            <Link href="/planificar" className="rounded-full bg-navy px-4 py-2 text-white hover:bg-navy/90">
              Planificar
            </Link>
          </nav>
        </Container>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="mt-20 border-t border-line bg-white no-print">
        <Container className="grid gap-8 py-10 text-sm text-muted sm:grid-cols-3">
          <div className="space-y-3">
            <Logo size={170} />
            <p className="max-w-xs">Diseñamos viajes alrededor de cada persona: sus prioridades, sus tiempos y lo que sueña vivir.</p>
          </div>
          <div className="space-y-2">
            <p className="font-display text-base text-navy">Hablemos</p>
            {wa && (
              <a className="flex items-center gap-2 hover:text-navy" href={whatsappLink(wa, "Hola VIORA TRAVEL, quiero consultar por un viaje.")} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" aria-hidden /> WhatsApp
              </a>
            )}
            {agency.email() && (
              <a className="block hover:text-navy" href={`mailto:${agency.email()}`}>
                {agency.email()}
              </a>
            )}
          </div>
          <div className="space-y-2">
            <p className="font-display text-base text-navy">Información</p>
            <Link className="block hover:text-navy" href="/privacidad">
              Privacidad y datos personales
            </Link>
            <Link className="block hover:text-navy" href="/terminos">
              Términos de uso
            </Link>
            <Link className="block hover:text-navy" href="/app">
              Instalá la app
            </Link>
            {process.env.AGENCY_LEGAL_ID && <p>Legajo: {process.env.AGENCY_LEGAL_ID}</p>}
          </div>
        </Container>
        <div className="border-t border-line py-4 text-center text-xs text-muted">© {new Date().getFullYear()} VIORA TRAVEL · Viajá. Viví. Recordá.</div>
      </footer>
    </>
  );
}
