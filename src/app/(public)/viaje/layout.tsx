import { redirect } from "next/navigation";
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
