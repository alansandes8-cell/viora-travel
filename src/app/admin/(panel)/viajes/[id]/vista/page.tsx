import Link from "next/link";
import { notFound } from "next/navigation";
import { TripView } from "@/components/my-trip/trip-view";
import { todayAR } from "@/core/my-trip";
import { requireStaff } from "@/server/auth/session";
import { EUROPA_GO_URL, tripBundle } from "@/server/services/my-trip";

export const metadata = { title: "Vista del cliente" };

export default async function VistaClientePage({ params }: PageProps<"/admin/viajes/[id]/vista">) {
  await requireStaff();
  const { id } = await params;
  const b = await tripBundle(id, null);
  if (!b) notFound();
  return (
    <div className="-mx-4 sm:-mx-6">
      <p className="mx-4 mb-3 rounded-xl bg-orange-brand/15 px-3 py-2 text-sm text-navy sm:mx-6">
        Vista previa: así lo ve el cliente{b.trip.status !== "published" && " cuando lo publiques"}.{" "}
        <Link href={`/admin/viajes/${id}`} className="font-semibold underline">
          Volver a editar
        </Link>
      </p>
      <TripView trip={b.trip} items={b.items} files={b.files} today={todayAR()} whatsapp={null} europaGoUrl={EUROPA_GO_URL()} />
    </div>
  );
}
