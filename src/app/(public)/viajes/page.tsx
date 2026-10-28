import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { Badge, Button, Card, Container } from "@/components/ui";
import { listSavedTrips } from "@/server/services/client-flow";
import { forgetTripAction, newTripAction, openTripAction } from "./actions";
import { ConfirmSubmit } from "./confirm-submit";

export const metadata: Metadata = { title: "Mis viajes" };
export const dynamic = "force-dynamic";

const fmt = (iso: string) => new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });

export default async function MisViajesPage() {
  const trips = await listSavedTrips();
  return (
    <Container className="max-w-3xl py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold sm:text-4xl">Mis viajes</h1>
          <p className="mt-2 text-muted">Tus planes quedan guardados en este dispositivo. Podés armar varios y volver a cualquiera cuando quieras.</p>
        </div>
        <form action={newTripAction}>
          <Button type="submit">
            <Plus className="h-4 w-4" aria-hidden /> Planificar un viaje nuevo
          </Button>
        </form>
      </div>

      {trips.length === 0 ? (
        <Card className="mt-8 p-6 text-center">
          <p className="text-4xl" aria-hidden>
            🧳
          </p>
          <p className="mt-2 font-semibold text-navy">Todavía no tenés viajes guardados</p>
          <p className="mt-1 text-sm text-muted">Cuando empieces a planificar, tu viaje aparece acá automáticamente.</p>
        </Card>
      ) : (
        <ul className="mt-8 space-y-3">
          {trips.map((t) => (
            <li key={t.id}>
              <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-lg font-semibold">{t.title}</h2>
                    {t.current && <Badge tone="teal">Abierto ahora</Badge>}
                    <Badge tone={t.hasProposal ? "success" : "neutral"}>{t.hasProposal ? "Con propuesta" : "Borrador"}</Badge>
                  </div>
                  {t.detail && <p className="mt-1 text-sm text-muted">{t.detail}</p>}
                  <p className="mt-1 text-xs text-muted">Última modificación: {fmt(t.updatedAt)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <form action={openTripAction}>
                    <input type="hidden" name="id" value={t.id} />
                    <Button type="submit">{t.hasProposal ? "Ver propuesta" : "Seguir completando"}</Button>
                  </form>
                  <form action={forgetTripAction}>
                    <input type="hidden" name="id" value={t.id} />
                    <ConfirmSubmit message={`¿Quitar «${t.title}» de Mis viajes? Ya no vas a poder abrirlo desde este dispositivo.`}>Quitar</ConfirmSubmit>
                  </form>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 text-xs text-muted">Para abrir un viaje en otro dispositivo, entrá a la propuesta y usá «Continuar en otro dispositivo», en la sección para pedir la propuesta personalizada.</p>
    </Container>
  );
}
