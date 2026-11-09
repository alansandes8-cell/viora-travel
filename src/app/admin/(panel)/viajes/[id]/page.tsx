import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Eye, FileText, Trash2 } from "lucide-react";
import { ITEM_KINDS, isItemKind } from "@/core/my-trip";
import { PageHeader, Panel } from "@/components/admin/bits";
import { Badge } from "@/components/ui";
import { requireStaff } from "@/server/auth/session";
import { db, schema } from "@/server/db";
import { tripBundle } from "@/server/services/my-trip";
import { autoPlanAction, deleteFileAction, deleteItemAction, deleteTripAction } from "../actions";
import { AccessForm, EditableItem, NewItem, PlanEditor, TripForm, UploadVoucher, type ItemValues } from "../editor";

export const metadata = { title: "Viaje vendido" };

export default async function ViajeVendidoPage({ params }: PageProps<"/admin/viajes/[id]">) {
  const staff = await requireStaff();
  const b = await tripBundle((await params).id, null);
  if (!b) notFound();
  const { trip, items, files } = b;
  const client = await db().query.clients.findFirst({ where: eq(schema.clients.id, trip.clientId) });
  const account = await db().query.clientAccounts.findFirst({ where: eq(schema.clientAccounts.clientId, trip.clientId) });
  const itemOpts = items.map((i) => ({ id: i.id, title: `${ITEM_KINDS[i.kind as keyof typeof ITEM_KINDS]?.emoji ?? ""} ${i.title}` }));
  const toValues = (i: (typeof items)[number]): ItemValues => ({
    id: i.id,
    kind: i.kind,
    title: i.title,
    provider: i.provider,
    startDate: i.startDate ?? "",
    startTime: i.startTime,
    endDate: i.endDate ?? "",
    endTime: i.endTime,
    place: i.place,
    address: i.address,
    confirmation: i.confirmation,
    details: i.details,
    breakfast: i.breakfast,
    rating: i.rating,
    price: i.price ? String(Number(i.price)) : "",
    currency: i.currency,
    photos: i.photos.join(" "),
    voucherUrl: i.voucherUrl,
  });

  return (
    <>
      <PageHeader
        title={`${trip.title} ${trip.subtitle}`.trim()}
        subtitle={
          <>
            Cliente:{" "}
            <Link href={`/admin/clientes/${trip.clientId}`} className="font-semibold underline">
              {client?.name ?? "—"}
            </Link>{" "}
            · <Badge tone={trip.status === "published" ? "teal" : "orange"}>{trip.status === "published" ? "Publicado en «Mi viaje»" : "Borrador"}</Badge>
          </>
        }
        actions={
          <Link href={`/admin/viajes/${trip.id}/vista`} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-semibold text-navy">
            <Eye className="h-4 w-4" aria-hidden /> Ver como el cliente
          </Link>
        }
      />
      <div className="space-y-6">
        <Panel title="1. Datos del viaje">
          <TripForm
            tripId={trip.id}
            initial={{ title: trip.title, subtitle: trip.subtitle, startDate: trip.startDate, endDate: trip.endDate, travelers: trip.travelers, coverPlace: trip.coverPlace, europaGo: trip.europaGo, assistance: trip.assistance, notes: trip.notes, status: trip.status }}
          />
        </Panel>

        <Panel title={`2. Servicios comprados (${items.length})`}>
          <ul className="space-y-3">
            {items.map((i) => {
              const k = isItemKind(i.kind) ? ITEM_KINDS[i.kind] : ITEM_KINDS.other;
              const vouchers = files.filter((f) => f.itemId === i.id);
              return (
                <li key={i.id} className="rounded-xl border border-line p-3">
                  <EditableItem tripId={trip.id} values={toValues(i)}>
                    <p className="font-semibold text-navy">
                      {k.emoji} {i.title}
                    </p>
                    <p className="text-sm text-muted">
                      {k.label}
                      {i.place && ` · ${i.place}`}
                      {i.startDate && ` · ${i.startDate}${i.startTime ? ` ${i.startTime}` : ""}`}
                      {i.endDate && ` → ${i.endDate}${i.endTime ? ` ${i.endTime}` : ""}`}
                      {i.confirmation && ` · Reserva ${i.confirmation}`}
                    </p>
                    <p className="text-xs text-muted">{vouchers.length ? `📎 ${vouchers.map((v) => v.filename).join(", ")}` : i.voucherUrl ? "🔗 Voucher por enlace" : "Sin voucher"}</p>
                  </EditableItem>
                  <form action={deleteItemAction.bind(null, trip.id, i.id)} className="mt-2">
                    <button className="inline-flex items-center gap-1 text-xs font-semibold text-danger">
                      <Trash2 className="h-3.5 w-3.5" aria-hidden /> Quitar servicio
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
          <div className="mt-4">
            <NewItem tripId={trip.id} />
          </div>
        </Panel>

        <Panel title="3. Vouchers (PDF o fotos)">
          <UploadVoucher tripId={trip.id} items={itemOpts} />
          {files.length > 0 && (
            <ul className="mt-4 divide-y divide-line text-sm">
              {files.map((f) => (
                <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <a href={`/mi-viaje/archivo/${f.id}`} target="_blank" className="inline-flex items-center gap-1.5 font-semibold text-navy underline">
                    <FileText className="h-4 w-4" aria-hidden /> {f.filename}
                  </a>
                  <span className="text-xs text-muted">
                    {items.find((i) => i.id === f.itemId)?.title ?? "General"} · {Math.round(f.size / 1024)} KB
                  </span>
                  <form action={deleteFileAction.bind(null, trip.id, f.id)}>
                    <button className="text-xs font-semibold text-danger">Eliminar</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="4. Plan día por día"
          actions={
            <form action={autoPlanAction.bind(null, trip.id)}>
              <button className="text-sm font-semibold text-navy underline">Completar automáticamente con los servicios</button>
            </form>
          }
        >
          <p className="mb-3 text-sm text-muted">
            Un día por fecha del viaje. La ciudad se completa sola según el hotel de esa noche y los vuelos, trenes, traslados y actividades aparecen en su día (después podés editarlos). Tocá un día para cargar el horario como en tu PDF.
          </p>
          <PlanEditor key={trip.updatedAt.toISOString()} tripId={trip.id} initial={trip.plan} items={itemOpts} />
        </Panel>

        <Panel title="5. Acceso del cliente">
          <AccessForm clientId={trip.clientId} email={account?.email ?? client?.email ?? ""} hasAccount={!!account} activated={!!account?.passwordHash} clientName={client?.name ?? ""} phone={client?.phone ?? ""} />
          {trip.status !== "published" && <p className="mt-3 text-sm font-semibold text-orange-brand">Ojo: el viaje está en borrador. Pasalo a «Publicado» en el paso 1 para que el cliente lo vea.</p>}
        </Panel>

        {staff.role === "owner" && (
          <form action={deleteTripAction.bind(null, trip.id)}>
            <button className="text-sm font-semibold text-danger underline">Eliminar este viaje vendido</button>
          </form>
        )}
      </div>
    </>
  );
}
