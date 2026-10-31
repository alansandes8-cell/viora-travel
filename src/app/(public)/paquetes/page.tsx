import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { PACKAGE_CATEGORIES } from "@/core/packages";
import { SmartImage } from "@/components/media/smart-image";
import { ButtonLink, Card, Container, cx } from "@/components/ui";
import { packageCover, packageKind, packageNights, packagePrice } from "@/server/package-view";
import { publishedPackages } from "@/server/services/packages";
import { loadLibrary } from "@/server/settings";

export const metadata: Metadata = { title: "Paquetes armados", description: "Paquetes de viaje listos para salir: Disney, Europa, Caribe, Brasil, Argentina, Asia y más." };
export const dynamic = "force-dynamic";

export default async function PaquetesPage({ searchParams }: PageProps<"/paquetes">) {
  const sp = await searchParams;
  const cat = typeof sp.cat === "string" ? sp.cat : "";
  const [all, library] = await Promise.all([publishedPackages(), loadLibrary()]);
  const categories = PACKAGE_CATEGORIES.filter((c) => all.some((p) => p.category === c.id));
  const list = cat ? all.filter((p) => p.category === cat) : all;
  const covers = await Promise.all(list.map((p) => packageCover(p, library)));
  const names = (p: (typeof all)[number]) => p.stops.map((s) => library.find((d) => d.id === s.destinationId)?.name ?? s.destinationId).join(" · ");

  return (
    <Container className="py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-coral-brand">Listos para salir</p>
          <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">Paquetes armados</h1>
          <p className="mt-2 max-w-2xl text-muted">Elegí una experiencia y mirá los paquetes. Si preferís algo hecho a tu medida, usá el planificador.</p>
        </div>
        <ButtonLink href="/planificar" variant="secondary">
          <Sparkles className="h-4 w-4" aria-hidden /> Prefiero armarlo a medida
        </ButtonLink>
      </div>

      <nav aria-label="Experiencias" className="mt-6 flex flex-wrap gap-2">
        <Link href="/paquetes" className={cx("rounded-full border px-3.5 py-2 text-sm font-semibold", !cat ? "border-navy bg-navy text-white" : "border-line bg-white text-navy")}>
          Todos
        </Link>
        {categories.map((c) => (
          <Link key={c.id} href={`/paquetes?cat=${c.id}`} className={cx("rounded-full border px-3.5 py-2 text-sm font-semibold", cat === c.id ? "border-navy bg-navy text-white" : "border-line bg-white text-navy")}>
            <span aria-hidden>{c.emoji}</span> {c.label}
          </Link>
        ))}
      </nav>

      {list.length === 0 ? (
        <p className="mt-10 text-muted">Pronto vamos a sumar paquetes en esta categoría. Mientras tanto, armá tu viaje a medida en el planificador.</p>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p, i) => {
            const price = packagePrice(p);
            const c = PACKAGE_CATEGORIES.find((x) => x.id === p.category);
            return (
              <Link key={p.id} href={`/paquetes/${p.slug}`} className="group">
                <Card className="flex h-full flex-col overflow-hidden transition-shadow group-hover:shadow-lift">
                  <div className="relative">
                    <SmartImage image={covers[i]} alt={p.title} thumb showCredit={false} className="aspect-[16/10] w-full" fallbackLabel={p.title} kind={packageKind(p, library)} />
                    {c && (
                      <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-navy shadow-soft">
                        {c.emoji} {c.label}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <h2 className="text-lg font-semibold leading-tight">{p.title}</h2>
                    <p className="mt-1 text-sm text-muted">
                      {packageNights(p)} noches · {names(p)}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm">{p.summary}</p>
                    <div className="mt-auto pt-4">
                      {price ? (
                        <p className="text-navy">
                          <span className="text-xs text-muted">Desde</span> <b className="text-xl">{price}</b> <span className="text-xs text-muted">{p.priceNote}</span>
                        </p>
                      ) : (
                        <p className="font-semibold text-teal-brand">Consultá el precio</p>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </Container>
  );
}
