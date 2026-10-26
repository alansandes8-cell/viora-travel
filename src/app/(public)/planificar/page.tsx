import type { Metadata } from "next";
import { TRIP_STYLES, type TripStyle } from "@/core/types";
import { loadDraft } from "@/server/services/client-flow";
import { loadLibrary } from "@/server/settings";
import { Wizard } from "./wizard";

export const metadata: Metadata = { title: "Planificá tu viaje" };
export const dynamic = "force-dynamic";

export default async function PlanificarPage({ searchParams }: PageProps<"/planificar">) {
  const sp = await searchParams;
  const draft = await loadDraft();
  const library = await loadLibrary();
  const suggestions = [...new Set(library.flatMap((d) => [d.name, d.country]))].sort((a, b) => a.localeCompare(b, "es"));
  const estilo = typeof sp.estilo === "string" && (TRIP_STYLES as readonly string[]).includes(sp.estilo) ? (sp.estilo as TripStyle) : undefined;
  return <Wizard initial={draft?.answers ?? null} initialStep={draft?.step ?? 0} preselect={estilo} suggestions={suggestions} hasProposal={!!draft?.hasProposal} />;
}
