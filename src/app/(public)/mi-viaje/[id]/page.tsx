import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LogOut } from "lucide-react";
import { TripView } from "@/components/my-trip/trip-view";
import { requireClient } from "@/server/auth/client-session";
import { whatsappLink } from "@/server/integrations/notify";
import { EUROPA_GO_URL, tripBundle, tripsForClient } from "@/server/services/my-trip";
import { agency } from "@/server/settings";
import { todayAR } from "@/core/my-trip";
import { logoutAction } from "../../acceder/actions";

export const metadata: Metadata = { title: "Mi viaje", robots: { index: false, follow: false } };


export default async function MiViajeDetalle({ params }: PageProps<"/mi-viaje/[id]">) {
  const acc = await requireClient();
  const b = await tripBundle((await params).id, acc.clientId);
  if (!b) notFound();
  const others = (await tripsForClient(acc.clientId)).length;
  const wa = agency.whatsapp() ? whatsappLink(agency.whatsapp(), `¡Hola! Soy ${acc.name || acc.email}, te escribo por mi viaje «${b.trip.title} ${b.trip.subtitle}».`) : null;
  return (
    <>
      <TripView trip={b.trip} items={b.items} files={b.files} today={todayAR()} whatsapp={wa} europaGoUrl={EUROPA_GO_URL()} />
      <div className="mx-auto flex max-w-5xl flex-wrap justify-between gap-3 px-4 text-sm">
        {others > 1 ? (
          <Link href="/mi-viaje" className="font-semibold text-navy underline">
            Ver mis otros viajes
          </Link>
        ) : (
          <span />
        )}
        <form action={logoutAction}>
          <button className="inline-flex items-center gap-1.5 font-semibold text-muted hover:text-navy">
            <LogOut className="h-4 w-4" aria-hidden /> Cerrar sesión
          </button>
        </form>
      </div>
    </>
  );
}
