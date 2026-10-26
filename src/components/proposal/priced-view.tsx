import { Card, Logo, Notice } from "@/components/ui";

export interface PricedProposal {
  kind: "priced_proposal";
  title: string;
  route: { name: string; nights: number }[];
  startDate: string | null;
  travelers: number;
  services: string[];
  included: string | null;
  excluded: string | null;
  conditions: string | null;
  paymentTerms: string | null;
  validUntil: string;
  currency: string;
  total: string;
  perPerson: string;
  issuedAt: string;
}

/** Propuesta comercial presupuestada: documento independiente de la propuesta inspiracional. */
export function PricedView({ p }: { p: PricedProposal }) {
  const fmt = (v: string) => `${p.currency} ${Number(v).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const expired = new Date(p.validUntil + "T23:59:59") < new Date();
  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <header className="flex items-center justify-between">
        <Logo size={90} />
        <div className="text-right text-xs text-muted">
          <p className="font-bold uppercase text-navy">Propuesta comercial</p>
          <p>Emitida el {new Date(p.issuedAt).toLocaleDateString("es-AR")}</p>
        </div>
      </header>
      <h1 className="text-3xl font-semibold">{p.title}</h1>
      {expired && <Notice tone="danger">Esta propuesta venció el {p.validUntil}. Consultanos para actualizarla.</Notice>}
      <Card className="p-5">
        <p className="text-sm text-muted">Ruta</p>
        <p className="font-semibold text-navy">{p.route.map((r) => `${r.name} (${r.nights} noches)`).join(" → ")}</p>
        <p className="mt-2 text-sm text-muted">
          {p.travelers} viajero(s){p.startDate ? ` · salida ${p.startDate}` : ""}
        </p>
      </Card>
      <Card className="p-5">
        <h2 className="text-lg font-semibold">Servicios incluidos</h2>
        <ul className="mt-2 list-disc pl-5 text-sm">
          {p.services.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        {p.included && <p className="mt-3 whitespace-pre-wrap text-sm">{p.included}</p>}
        {p.excluded && (
          <>
            <h3 className="mt-4 font-semibold">No incluye</h3>
            <p className="whitespace-pre-wrap text-sm">{p.excluded}</p>
          </>
        )}
      </Card>
      <Card className="bg-navy p-6 text-white">
        <p className="text-sm text-white/70">Precio total</p>
        <p className="font-display text-4xl">{fmt(p.total)}</p>
        <p className="mt-1 text-white/80">{fmt(p.perPerson)} por persona</p>
        <p className="mt-3 text-sm text-white/70">Vigencia: hasta el {p.validUntil}. Sujeto a disponibilidad al momento de reservar.</p>
      </Card>
      {p.paymentTerms && (
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Condiciones de pago</h2>
          <p className="mt-1 whitespace-pre-wrap text-sm">{p.paymentTerms}</p>
        </Card>
      )}
      {p.conditions && (
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Condiciones generales</h2>
          <p className="mt-1 whitespace-pre-wrap text-sm">{p.conditions}</p>
        </Card>
      )}
    </article>
  );
}
