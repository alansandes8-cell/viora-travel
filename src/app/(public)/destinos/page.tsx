import type { Metadata } from "next";
import Link from "next/link";
import { SUPER_REGION, SUPER_REGION_LABEL } from "@/core/library";
import { bestMonths, guideYear, monthTable } from "@/core/destination-guide";
import { JsonLd, breadcrumbs } from "@/components/seo/json-ld";
import { Container } from "@/components/ui";
import { siteUrl } from "@/server/seo";
import { loadLibrary } from "@/server/settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: `Guías de destinos: a dónde viajar desde Argentina en ${guideYear()}`,
  description: "Más de 60 destinos del mundo con la mejor época para ir, cuánto cuesta el viaje desde Argentina, qué hacer y dónde alojarse. Europa, Caribe, Brasil, Estados Unidos, Asia y Argentina.",
  alternates: { canonical: "/destinos" },
};

const ORDER = ["caribe", "europa", "usa", "brasil", "mexico", "argentina", "sudamerica", "centroamerica", "japon", "sudeste-asiatico", "indico", "medio-oriente"];

export default async function DestinosPage() {
  const library = await loadLibrary();
  const regions = [...ORDER, ...new Set(library.map((d) => SUPER_REGION[d.cluster]).filter((r) => r && !ORDER.includes(r)))];
  const groups = regions.map((r) => ({ r, list: library.filter((d) => SUPER_REGION[d.cluster] === r).sort((a, b) => a.name.localeCompare(b.name, "es")) })).filter((g) => g.list.length);
  return (
    <Container className="py-10">
      <JsonLd data={breadcrumbs(siteUrl(), [["Inicio", "/"], ["Destinos", "/destinos"]])} />
      <p className="text-sm font-bold uppercase tracking-wider text-coral-brand">Guías de viaje</p>
      <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">¿A dónde viajar? Guías de destinos</h1>
      <p className="mt-2 max-w-2xl text-muted">Para cada destino: la mejor época para ir, cuánto cuesta el viaje desde Argentina, qué hacer, dónde alojarse y qué comer.</p>
      {groups.map(({ r, list }) => (
        <section key={r} className="mt-10">
          <h2 className="text-2xl font-semibold">Viajar a {SUPER_REGION_LABEL[r] ?? r}</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((d) => (
              <li key={d.id}>
                <Link href={`/destinos/${d.id}`} className="block h-full rounded-2xl border border-line bg-white p-4 transition-shadow hover:shadow-lift">
                  <span className="font-semibold text-navy">{d.name}</span> <span className="text-sm text-muted">· {d.country}</span>
                  <span className="mt-1 block text-sm text-muted">{d.summary}</span>
                  <span className="mt-2 block text-xs font-semibold text-teal-brand">
                    Mejor época: {bestMonths(monthTable(d), 3)
                      .map((m) => m.name)
                      .join(", ")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Container>
  );
}
