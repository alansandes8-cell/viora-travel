import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { Card, Container } from "@/components/ui";
import { requireClient } from "@/server/auth/client-session";
import { tripsForClient } from "@/server/services/my-trip";
import { logoutAction } from "../acceder/actions";

export const metadata: Metadata = { title: "Mi viaje", robots: { index: false, follow: false } };

export default async function MiViajePage() {
  const acc = await requireClient();
  const trips = await tripsForClient(acc.clientId);
  if (trips.length === 1) redirect(`/mi-viaje/${trips[0].id}`);
  const first = acc.name.split(" ")[0];
  return (
    <Container className="max-w-2xl py-10">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">¡Hola{first ? `, ${first}` : ""}! 👋</h1>
        <form action={logoutAction}>
          <button className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-navy">
            <LogOut className="h-4 w-4" aria-hidden /> Salir
          </button>
        </form>
      </div>
      {trips.length === 0 ? (
        <p className="mt-6 text-muted">Tu asesor está preparando tu viaje. Apenas esté listo, lo vas a ver acá con tus vouchers y el plan día por día.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {trips.map((t) => (
            <li key={t.id}>
              <Link href={`/mi-viaje/${t.id}`}>
                <Card className="p-5 transition-shadow hover:shadow-lift">
                  <p className="font-display text-xl text-navy">
                    {t.title} {t.subtitle}
                  </p>
                  <p className="text-sm text-muted">
                    {t.startDate} → {t.endDate}
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
