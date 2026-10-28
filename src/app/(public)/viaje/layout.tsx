import Link from "next/link";
import { redirect } from "next/navigation";
import { newTripAction } from "../viajes/actions";
import { currentProposal } from "@/server/services/client-flow";
import { Container } from "@/components/ui";
import { TripNav } from "./trip-nav";

export const dynamic = "force-dynamic";

export default async function ViajeLayout({ children }: { children: React.ReactNode }) {
  const data = await currentProposal();
  if (!data) redirect("/planificar");
  const p = data.proposal;
  return (
    <>
      <div className="border-b border-line bg-white no-print">
        <Container className="pt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            <Link href="/viajes" className="font-semibold text-navy hover:underline">
              ← Mis viajes
            </Link>
            <form action={newTripAction}>
              <button type="submit" className="rounded-full border border-line bg-white px-3 py-1.5 font-semibold text-navy hover:bg-sand-2">
                + Planificar otro viaje
              </button>
            </form>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider">
            <span className={p.status === "reviewed" ? "text-success" : "text-orange-brand"}>{p.status === "reviewed" ? "Propuesta revisada por VIORA" : "Propuesta preliminar"}</span>
            {p.exploratory && <span className="text-muted">· {p.travelMonths?.length ? "Fechas exactas a confirmar" : "Exploratoria, sin fechas definidas"}</span>}
          </div>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{p.title}</h1>
          <p className="mt-2 max-w-3xl text-muted">{p.concept}</p>
          <TripNav />
        </Container>
      </div>
      {children}
    </>
  );
}
