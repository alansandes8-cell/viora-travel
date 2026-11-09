"use client";

import { useActionState, useState, useTransition, startTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Copy, MessageCircle, Plus, Trash2, Upload } from "lucide-react";
import { ITEM_KINDS, flag, shortDate, weekday } from "@/core/my-trip";
import { Button, Notice, cx, inputClass, keepFields } from "@/components/ui";
import { clientAccessAction, createTripAction, savePlanAction, saveItemAction, updateTripAction } from "./actions";

const small = `${inputClass} mt-1`;
const label = "block text-sm font-semibold text-navy";

export interface TripFormValues {
  title: string;
  subtitle: string;
  startDate: string;
  endDate: string;
  travelers: string;
  coverPlace: string;
  europaGo: boolean;
  assistance: string;
  notes: string;
  status: string;
}

export function TripForm({ tripId, clientId, initial }: { tripId?: string; clientId?: string; initial: TripFormValues }) {
  const action = tripId ? updateTripAction.bind(null, tripId) : createTripAction.bind(null, clientId!);
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form onSubmit={keepFields(formAction, startTransition)} className="grid min-w-0 gap-3 sm:grid-cols-2">
      <label className={label}>
        Título de portada
        <input name="title" defaultValue={initial.title} maxLength={80} className={small} placeholder="Plan de viaje" />
      </label>
      <label className={label}>
        Subtítulo
        <input name="subtitle" defaultValue={initial.subtitle} maxLength={80} className={small} placeholder="Europa 2027" />
      </label>
      <label className={label}>
        Salida
        <input type="date" name="startDate" required defaultValue={initial.startDate} className={small} />
      </label>
      <label className={label}>
        Regreso
        <input type="date" name="endDate" required defaultValue={initial.endDate} className={small} />
      </label>
      <label className={label}>
        Viajeros
        <input name="travelers" defaultValue={initial.travelers} maxLength={200} className={small} placeholder="Ana y Juan Pérez" />
      </label>
      <label className={label}>
        Foto de portada (lugar)
        <input name="coverPlace" defaultValue={initial.coverPlace} maxLength={120} className={small} placeholder="Lago di Braies, o un enlace https a tu foto" />
      </label>
      <label className={`${label} sm:col-span-2`}>
        Asistencia al viajero / emergencias (teléfono, póliza, enlace)
        <input name="assistance" defaultValue={initial.assistance} maxLength={400} className={small} placeholder="Assist Card · póliza 123456 · +54 11 …" />
      </label>
      <label className={`${label} sm:col-span-2`}>
        Mensaje para el cliente (opcional)
        <textarea name="notes" defaultValue={initial.notes} maxLength={2000} rows={3} className={small} placeholder="Recomendaciones generales, documentación, etc." />
      </label>
      <label className="flex items-center gap-2 text-sm font-semibold text-navy">
        <input type="checkbox" name="europaGo" defaultChecked={initial.europaGo} className="h-4 w-4" /> Incluye la app Europa Go
      </label>
      <label className={label}>
        Estado
        <select name="status" defaultValue={initial.status} className={small}>
          <option value="draft">Borrador (el cliente no lo ve)</option>
          <option value="published">Publicado en «Mi viaje»</option>
        </select>
      </label>
      {state?.error && <Notice tone="danger">{state.error}</Notice>}
      {state?.ok && <Notice tone="success">Guardado.</Notice>}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : tripId ? "Guardar datos del viaje" : "Crear viaje"}
        </Button>
      </div>
    </form>
  );
}

export interface ItemValues {
  id?: string;
  kind: string;
  title: string;
  provider: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  place: string;
  address: string;
  confirmation: string;
  details: string;
  breakfast: boolean | null;
  rating: string;
  price: string;
  currency: string;
  photos: string;
  voucherUrl: string;
}

export const EMPTY_ITEM: ItemValues = { kind: "hotel", title: "", provider: "", startDate: "", startTime: "", endDate: "", endTime: "", place: "", address: "", confirmation: "", details: "", breakfast: null, rating: "", price: "", currency: "USD", photos: "", voucherUrl: "" };

export function ItemForm({ tripId, initial, onDone }: { tripId: string; initial: ItemValues; onDone?: () => void }) {
  const [kind, setKind] = useState(initial.kind);
  const [state, formAction, pending] = useActionState(async (prev: { error?: string; ok?: boolean } | null, fd: FormData) => {
    const r = await saveItemAction(tripId, initial.id ?? null, prev, fd);
    if (r?.ok) onDone?.();
    return r;
  }, null);
  const isHotel = kind === "hotel";
  return (
    <form onSubmit={keepFields(formAction, startTransition)} className="grid min-w-0 gap-3 rounded-xl bg-sand p-3 sm:grid-cols-4">
      <label className={label}>
        Tipo
        <select name="kind" value={kind} onChange={(e) => setKind(e.target.value)} className={small}>
          {Object.entries(ITEM_KINDS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.emoji} {v.label}
            </option>
          ))}
        </select>
      </label>
      <label className={`${label} sm:col-span-2`}>
        Nombre
        <input name="title" required defaultValue={initial.title} maxLength={160} className={small} placeholder={isHotel ? "Hotel Roma Termini" : kind === "flight" ? "Buenos Aires → Roma (ITA AZ681)" : "Free tour por Roma"} />
      </label>
      <label className={label}>
        Empresa / proveedor
        <input name="provider" defaultValue={initial.provider} maxLength={120} className={small} />
      </label>
      <label className={label}>
        {isHotel ? "Check-in (fecha)" : "Fecha"}
        <input type="date" name="startDate" defaultValue={initial.startDate} className={small} />
      </label>
      <label className={label}>
        {isHotel ? "Hora de check-in" : "Hora"}
        <input type="time" name="startTime" defaultValue={initial.startTime} className={small} />
      </label>
      <label className={label}>
        {isHotel ? "Check-out (fecha)" : "Fecha de llegada / fin"}
        <input type="date" name="endDate" defaultValue={initial.endDate} className={small} />
      </label>
      <label className={label}>
        {isHotel ? "Hora de check-out" : "Hora de llegada / fin"}
        <input type="time" name="endTime" defaultValue={initial.endTime} className={small} />
      </label>
      <label className={label}>
        Ciudad
        <input name="place" defaultValue={initial.place} maxLength={120} className={small} placeholder="Roma" />
      </label>
      <label className={`${label} sm:col-span-2`}>
        Dirección / punto de encuentro
        <input name="address" defaultValue={initial.address} maxLength={300} className={small} placeholder="Via Marsala 9, Roma (cerca de Termini)" />
      </label>
      <label className={label}>
        Código de reserva
        <input name="confirmation" defaultValue={initial.confirmation} maxLength={120} className={small} />
      </label>
      {isHotel && (
        <>
          <label className={label}>
            Desayuno
            <select name="breakfast" defaultValue={initial.breakfast === null ? "" : initial.breakfast ? "yes" : "no"} className={small}>
              <option value="">Sin indicar</option>
              <option value="yes">Incluido</option>
              <option value="no">No incluido</option>
            </select>
          </label>
          <label className={label}>
            Puntaje
            <input name="rating" defaultValue={initial.rating} maxLength={20} className={small} placeholder="4,9" />
          </label>
        </>
      )}
      <label className={label}>
        Precio (opcional)
        <input name="price" inputMode="decimal" defaultValue={initial.price} className={small} placeholder="266" />
      </label>
      <label className={label}>
        Moneda
        <select name="currency" defaultValue={initial.currency} className={small}>
          <option>USD</option>
          <option>EUR</option>
          <option>ARS</option>
        </select>
      </label>
      <label className={`${label} sm:col-span-4`}>
        Detalles para el cliente
        <textarea name="details" defaultValue={initial.details} maxLength={2000} rows={2} className={small} placeholder={kind === "flight" ? "Equipaje: 1 valija de 23 kg + carry on. Presentarse 3 h antes." : "Qué incluye, cómo llegar, qué llevar…"} />
      </label>
      <label className={`${label} sm:col-span-2`}>
        Fotos (enlaces https, separados por espacio)
        <input name="photos" defaultValue={initial.photos} className={small} placeholder="https://…jpg https://…jpg" />
      </label>
      <label className={`${label} sm:col-span-2`}>
        Enlace al voucher o a la reserva (opcional)
        <input name="voucherUrl" defaultValue={initial.voucherUrl} maxLength={500} className={small} placeholder="https://… (o subí el PDF abajo)" />
      </label>
      {state?.error && <Notice tone="danger">{state.error}</Notice>}
      <div className="flex gap-2 sm:col-span-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : initial.id ? "Guardar servicio" : "Agregar servicio"}
        </Button>
        {onDone && initial.id && (
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}

export function EditableItem({ tripId, values, children }: { tripId: string; values: ItemValues; children: React.ReactNode }) {
  const [editing, setEditing] = useState(false);
  return editing ? (
    <ItemForm tripId={tripId} initial={values} onDone={() => setEditing(false)} />
  ) : (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0 flex-1">{children}</div>
      <Button type="button" variant="secondary" onClick={() => setEditing(true)}>
        Editar
      </Button>
    </div>
  );
}

export function NewItem({ tripId }: { tripId: string }) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);
  return open ? (
    <ItemForm
      key={key}
      tripId={tripId}
      initial={EMPTY_ITEM}
      onDone={() => {
        setKey((k) => k + 1);
        setOpen(false);
      }}
    />
  ) : (
    <Button type="button" onClick={() => setOpen(true)}>
      <Plus className="h-4 w-4" aria-hidden /> Agregar vuelo, hotel, traslado, actividad…
    </Button>
  );
}

export function UploadVoucher({ tripId, items }: { tripId: string; items: { id: string; title: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <form
      className="grid min-w-0 gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const form = e.currentTarget;
        start(async () => {
          const res = await fetch(`/admin/viajes-archivos/${tripId}`, { method: "POST", body: fd });
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          if (res.ok) {
            setMsg({ ok: true, text: "Voucher subido." });
            form.reset();
            router.refresh();
          } else setMsg({ ok: false, text: j.error ?? "No se pudo subir." });
        });
      }}
    >
      <label className={label}>
        Archivo (PDF o foto, hasta 10 MB)
        <input type="file" name="file" required multiple accept="application/pdf,image/jpeg,image/png,image/webp" className={`${small} py-2`} />
      </label>
      <label className={label}>
        ¿De qué servicio es?
        <select name="itemId" className={small}>
          <option value="">General del viaje</option>
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.title}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" disabled={pending}>
        <Upload className="h-4 w-4" aria-hidden /> {pending ? "Subiendo…" : "Subir"}
      </Button>
      {msg && (
        <Notice tone={msg.ok ? "success" : "danger"} className="sm:col-span-3">
          {msg.text}
        </Notice>
      )}
    </form>
  );
}

type Entry = { time: string; title: string; text: string; link: string; photo: string; itemId: string };
type Day = { date: string; city: string; countryCode: string; summary: string; entries: Entry[] };

/** Editor del plan día por día (como el PDF: horario, actividad, foto y enlace). */
export function PlanEditor({ tripId, initial, items }: { tripId: string; initial: Day[]; items: { id: string; title: string }[] }) {
  const [days, setDays] = useState<Day[]>(initial);
  const [open, setOpen] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const upd = (i: number, f: (d: Day) => Day) => {
    setDirty(true);
    setDays((ds) => ds.map((d, j) => (j === i ? f(d) : d)));
  };
  const save = () =>
    start(async () => {
      const r = await savePlanAction(tripId, days);
      setMsg(r.ok ? { ok: true, text: "Plan guardado." } : { ok: false, text: r.error ?? "No se pudo guardar." });
      if (r.ok) setDirty(false);
    });

  return (
    <div className="space-y-2">
      {days.map((d, i) => (
        <div key={d.date} className="rounded-xl border border-line bg-white">
          <button type="button" onClick={() => setOpen(open === i ? null : i)} className="flex w-full flex-wrap items-center justify-between gap-2 p-3 text-left">
            <span className="text-sm">
              <b className="text-navy">
                Día {i + 1} · <span className="capitalize">{weekday(d.date)}</span> {shortDate(d.date)}
              </b>{" "}
              {flag(d.countryCode)} {d.city || <span className="text-muted">sin ciudad</span>}
              {d.summary && <span className="text-muted"> — {d.summary}</span>}
            </span>
            <span className="text-xs text-muted">{d.entries.length} actividades</span>
          </button>
          {open === i && (
            <div className="space-y-3 border-t border-line p-3">
              <div className="grid gap-2 sm:grid-cols-[1fr_6rem_2fr]">
                <label className={label}>
                  Ciudad
                  <input value={d.city} maxLength={80} onChange={(e) => upd(i, (x) => ({ ...x, city: e.target.value }))} className={small} />
                </label>
                <label className={label}>
                  País (código)
                  <input value={d.countryCode} maxLength={2} placeholder="IT" onChange={(e) => upd(i, (x) => ({ ...x, countryCode: e.target.value.toUpperCase() }))} className={small} />
                </label>
                <label className={label}>
                  Resumen para el cronograma
                  <input value={d.summary} maxLength={120} placeholder="Día completo en Roma" onChange={(e) => upd(i, (x) => ({ ...x, summary: e.target.value }))} className={small} />
                </label>
              </div>
              {d.entries.map((e, k) => {
                const setE = (f: (x: Entry) => Entry) => upd(i, (x) => ({ ...x, entries: x.entries.map((y, z) => (z === k ? f(y) : y)) }));
                return (
                  <div key={k} className="grid gap-2 rounded-lg bg-sand p-2 sm:grid-cols-[6rem_1fr_auto]">
                    <label className={label}>
                      Hora
                      <input type="time" value={e.time} onChange={(ev) => setE((x) => ({ ...x, time: ev.target.value }))} className={small} />
                    </label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className={label}>
                        Actividad
                        <input value={e.title} maxLength={160} placeholder="Free tour por Roma" onChange={(ev) => setE((x) => ({ ...x, title: ev.target.value }))} className={small} />
                      </label>
                      <label className={label}>
                        Foto (lugar o enlace https)
                        <input value={e.photo} maxLength={500} placeholder="Fontana di Trevi" onChange={(ev) => setE((x) => ({ ...x, photo: ev.target.value }))} className={small} />
                      </label>
                      <label className={`${label} sm:col-span-2`}>
                        Detalle
                        <textarea value={e.text} maxLength={1000} rows={2} placeholder="No olvidarse del helado 🍦" onChange={(ev) => setE((x) => ({ ...x, text: ev.target.value }))} className={small} />
                      </label>
                      <label className={label}>
                        Enlace (entradas, mapa…)
                        <input value={e.link} maxLength={500} placeholder="https://…" onChange={(ev) => setE((x) => ({ ...x, link: ev.target.value }))} className={small} />
                      </label>
                      <label className={label}>
                        Voucher del servicio
                        <select value={e.itemId} onChange={(ev) => setE((x) => ({ ...x, itemId: ev.target.value }))} className={small}>
                          <option value="">Ninguno</option>
                          {items.map((it) => (
                            <option key={it.id} value={it.id}>
                              {it.title}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="flex gap-1 sm:flex-col">
                      <button type="button" aria-label="Subir" disabled={k === 0} onClick={() => upd(i, (x) => ({ ...x, entries: swap(x.entries, k, k - 1) }))} className="rounded-full p-2 hover:bg-white disabled:opacity-30">
                        <ArrowUp className="h-4 w-4" aria-hidden />
                      </button>
                      <button type="button" aria-label="Bajar" disabled={k === d.entries.length - 1} onClick={() => upd(i, (x) => ({ ...x, entries: swap(x.entries, k, k + 1) }))} className="rounded-full p-2 hover:bg-white disabled:opacity-30">
                        <ArrowDown className="h-4 w-4" aria-hidden />
                      </button>
                      <button type="button" aria-label="Quitar actividad" onClick={() => upd(i, (x) => ({ ...x, entries: x.entries.filter((_, z) => z !== k) }))} className="rounded-full p-2 text-danger hover:bg-white">
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </div>
                );
              })}
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => upd(i, (x) => ({ ...x, entries: [...x.entries, { time: "", title: "", text: "", link: "", photo: "", itemId: "" }] }))}>
                  <Plus className="h-4 w-4" aria-hidden /> Agregar actividad
                </Button>
                {i > 0 && (
                  <Button type="button" variant="ghost" onClick={() => upd(i, (x) => ({ ...x, city: days[i - 1].city, countryCode: days[i - 1].countryCode }))}>
                    <Copy className="h-4 w-4" aria-hidden /> Misma ciudad que el día anterior
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
      <div className={cx("sticky bottom-2 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white p-3 shadow-lift", !dirty && "opacity-90")}>
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? "Guardando…" : "Guardar plan"}
        </Button>
        {dirty && <span className="text-sm text-orange-brand">Hay cambios sin guardar</span>}
        {msg && <span className={cx("text-sm", msg.ok ? "text-teal-brand" : "text-danger")}>{msg.text}</span>}
      </div>
    </div>
  );
}

function swap<T>(xs: T[], a: number, b: number): T[] {
  const out = [...xs];
  [out[a], out[b]] = [out[b], out[a]];
  return out;
}

/** Crea o renueva el acceso del cliente: genera un enlace para que elija su contraseña. */
export function AccessForm({ clientId, email, hasAccount, activated, clientName, phone }: { clientId: string; email: string; hasAccount: boolean; activated: boolean; clientName: string; phone: string }) {
  const [state, formAction, pending] = useActionState(clientAccessAction.bind(null, clientId), null);
  const first = clientName.split(" ")[0] || "";
  const wa = state?.link
    ? `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(`¡Hola ${first}! 🎉 Ya está listo tu viaje en VIORA TRAVEL. Elegí tu contraseña acá y vas a ver tus vouchers y el plan día por día: ${state.link}`)}`
    : null;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        {activated ? "✅ El cliente ya tiene acceso a «Mi viaje»." : hasAccount ? "⏳ Acceso creado: falta que el cliente elija su contraseña." : "El cliente todavía no tiene acceso."} Se le manda un enlace para que elija su propia contraseña (nunca
        generamos ni enviamos contraseñas). El enlace vale 14 días y sirve una vez.
      </p>
      <form onSubmit={keepFields(formAction, startTransition)} className="flex flex-wrap items-end gap-2">
        <label className={`${label} min-w-56 flex-1`}>
          Email del cliente (será su usuario)
          <input type="email" name="email" required defaultValue={email} className={small} />
        </label>
        <Button type="submit" disabled={pending}>
          {pending ? "Generando…" : activated ? "Enviar enlace para cambiar contraseña" : "Dar acceso y generar enlace"}
        </Button>
      </form>
      {state?.error && <Notice tone="danger">{state.error}</Notice>}
      {state?.link && (
        <Notice tone="success">
          <span className="block">{state.emailed ? "Le mandamos el enlace por email. También podés pasárselo por WhatsApp:" : "Pasale este enlace al cliente (por WhatsApp):"}</span>
          <span className="mt-1 block break-all font-mono text-xs">{state.link}</span>
          <span className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => navigator.clipboard?.writeText(state.link!)} className="rounded-full border border-line bg-white px-3 py-1.5 text-sm font-semibold text-navy">
              Copiar enlace
            </button>
            {wa && phone && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-[#1f9d55] px-3 py-1.5 text-sm font-semibold text-white">
                <MessageCircle className="h-4 w-4" aria-hidden /> Enviar por WhatsApp
              </a>
            )}
          </span>
        </Notice>
      )}
    </div>
  );
}
