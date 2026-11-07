import "server-only";
import { agency } from "./settings";

/** Dirección pública del sitio (sin barra final). */
export const siteUrl = () => agency.appUrl();

/** Perfiles oficiales (para que Google vincule la marca): SOCIAL_LINKS=https://instagram.com/…,https://facebook.com/… */
export const socialLinks = () =>
  (process.env.SOCIAL_LINKS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^https:\/\//.test(s));

/** Agencia de viajes (schema.org/TravelAgency): nombre, logo, contacto y datos legales si están cargados. */
export function organizationLd() {
  const url = siteUrl();
  const phone = agency.whatsapp();
  return [
    {
      "@context": "https://schema.org",
      "@type": "TravelAgency",
      "@id": `${url}/#agencia`,
      name: "VIORA TRAVEL",
      url,
      logo: `${url}/icon.png`,
      image: `${url}/opengraph-image`,
      description: "Agencia de viajes argentina: paquetes armados, vuelos, hoteles, excursiones y viajes a medida con asesores reales.",
      areaServed: { "@type": "Country", name: "Argentina" },
      knowsLanguage: "es",
      ...(phone ? { telephone: `+${phone.replace(/\D/g, "")}` } : {}),
      ...(agency.email() ? { email: agency.email() } : {}),
      ...(process.env.AGENCY_ADDRESS ? { address: process.env.AGENCY_ADDRESS } : {}),
      ...(process.env.AGENCY_LEGAL_ID ? { identifier: `Legajo ${process.env.AGENCY_LEGAL_ID}` } : {}),
      ...(socialLinks().length ? { sameAs: socialLinks() } : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${url}/#sitio`,
      name: "VIORA TRAVEL",
      url,
      inLanguage: "es-AR",
      publisher: { "@id": `${url}/#agencia` },
    },
  ];
}
