import Link from "next/link";
import { PageHeader, Panel, ghostBtn, smallBtn } from "@/components/admin/bits";
import { Badge } from "@/components/ui";
import { PACKAGE_CATEGORIES } from "@/core/packages";
import { requireStaff } from "@/server/auth/session";
import { packageNights, packagePrice } from "@/server/package-view";
import { allPackages } from "@/server/services/packages";

export const metadata = { title: "Paquetes" };

export default async function PaquetesAdminPage() {
  await requireStaff();
  const list = await allPackages();
  const withoutPrice = list.filter((p) => p.status === "published" && !packagePrice(p)).length;
  return (
    <>
      <PageHeader
        title="Paquetes armados"
        subtitle="Se muestran en la web en /paquetes, por experiencia. Cargá precio y lo que incluye cada uno."
        actions={
          <div className="flex gap-2">
            <Link href="/paquetes" target="_blank" className={ghostBtn}>
              Ver en la web
            </Link>
            <Link href="/admin/paquetes/nuevo" className={smallBtn}>
              Nuevo paquete
            </Link>
          </div>
        }
      />
      {withoutPrice > 0 && <p className="mb-4 rounded-xl bg-warning/10 px-3 py-2 text-sm text-warning">{withoutPrice} paquetes publicados todavía no tienen precio: en la web dicen «Consultá el precio».</p>}
      {PACKAGE_CATEGORIES.map((c) => {
        const items = list.filter((p) => p.category === c.id);
        if (!items.length) return null;
        return (
          <Panel key={c.id} title={`${c.emoji} ${c.label}`} className="mb-4">
            <ul className="divide-y divide-line text-sm">
              {items.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-3 py-2">
                  <Link href={`/admin/paquetes/${p.id}`} className="font-semibold text-navy hover:underline">
                    {p.title}
                  </Link>
                  <span className="text-muted">{packageNights(p)} noches</span>
                  <span>{packagePrice(p) ?? <span className="text-muted">sin precio</span>}</span>
                  <Badge tone={p.status === "published" ? "success" : "neutral"}>{p.status === "published" ? "Publicado" : "Borrador"}</Badge>
                </li>
              ))}
            </ul>
          </Panel>
        );
      })}
      {list.length === 0 && <p className="text-sm text-muted">Todavía no hay paquetes.</p>}
    </>
  );
}
