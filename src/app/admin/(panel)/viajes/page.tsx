import Link from "next/link";
import { PageHeader } from "@/components/admin/bits";
import { Badge, EmptyState } from "@/components/ui";
import { requireStaff } from "@/server/auth/session";
import { allBookedTrips } from "@/server/services/my-trip";

export const metadata = { title: "Viajes vendidos" };

const fmt = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export default async function ViajesVendidosPage() {
  await requireStaff();
  const rows = await allBookedTrips();
  return (
    <>
      <PageHeader title="Viajes vendidos («Mi viaje»)" subtitle="Lo que cada cliente ve al entrar: reservas, vouchers y el plan día por día. Para crear uno, entrá a la ficha del cliente." />
      {rows.length === 0 ? (
        <EmptyState title="Todavía no hay viajes vendidos">
          Abrí un cliente en <Link className="underline" href="/admin/clientes">Clientes</Link> y tocá «Nuevo viaje vendido».
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {rows.map(({ t, client }) => (
            <li key={t.id}>
              <Link href={`/admin/viajes/${t.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-white p-4 hover:shadow-soft">
                <span>
                  <b className="text-navy">{client?.name ?? "Cliente"}</b> · {t.title} {t.subtitle}
                  <span className="block text-sm text-muted">
                    {fmt(t.startDate)} → {fmt(t.endDate)}
                  </span>
                </span>
                <Badge tone={t.status === "published" ? "teal" : "orange"}>{t.status === "published" ? "Publicado" : "Borrador"}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
