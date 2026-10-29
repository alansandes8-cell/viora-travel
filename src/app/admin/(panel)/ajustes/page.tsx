import { asc, eq } from "drizzle-orm";
import QRCode from "qrcode";
import { PageHeader, Panel, ghostBtn, smallBtn, smallInput } from "@/components/admin/bits";
import { Badge, Notice } from "@/components/ui";
import { BASE_WEIGHTS } from "@/core/catalog";
import { CRITERIA, CRITERIA_LABELS, type Criterion } from "@/core/types";
import { aiConfigured, aiModel } from "@/server/ai/claude";
import { requireStaff } from "@/server/auth/session";
import { totpUri } from "@/server/auth/totp";
import { db, publicDbIsolated, schema } from "@/server/db";
import { mediaStatus } from "@/server/integrations/media";
import { emailConfigured } from "@/server/integrations/notify";
import { chromiumPath } from "@/server/pdf";
import { getSetting } from "@/server/settings";
import { llmConfigured, llmProvider } from "@/server/ai/llm";
import { DEFAULT_DAILY_SPEND, type DailySpendTable } from "@/core/daily-spend";
import { DEFAULT_TRIP_ESTIMATE, type TripEstimateTable } from "@/core/trip-estimate";
import { SUPER_REGION_LABEL } from "@/core/library";
import { confirmTotp, createUser, purgeExpired, refreshPhotos, saveDailySpend, saveTripEstimate, testPdf, renameStatus, saveGeneral, saveWeights, startTotp, toggleUser } from "./actions";

export const metadata = { title: "Ajustes" };

export default async function AjustesPage() {
  const staff = await requireStaff();
  const owner = staff.role === "owner";
  const [weights, shareDays, retention, aiLimit, genLimit, statuses, users, pending, photoRun, photoCount] = await Promise.all([
    getSetting<Record<Criterion, number>>("scoring_weights", BASE_WEIGHTS),
    getSetting<number>("share_link_days", 90),
    getSetting<number>("draft_retention_days", 90),
    getSetting<number>("ai_daily_limit", 200),
    getSetting<number>("generations_per_ip_per_hour", 15),
    db().select().from(schema.projectStatuses).orderBy(asc(schema.projectStatuses.sort)),
    db().select().from(schema.staffUsers).orderBy(asc(schema.staffUsers.createdAt)),
    db().query.settings.findFirst({ where: eq(schema.settings.key, `pending_totp:${staff.id}`) }),
    getSetting<{ titles: number; found: number; missing: string[]; error?: string; at: string } | null>("last_photo_refresh", null),
    db()
      .select({ ok: schema.mediaQueries.status })
      .from(schema.mediaQueries)
      .where(eq(schema.mediaQueries.provider, "wikipedia")),
  ]);
  const spend = await getSetting<DailySpendTable>("daily_spend", DEFAULT_DAILY_SPEND);
  const est = await getSetting<TripEstimateTable>("trip_estimate", DEFAULT_TRIP_ESTIMATE);
  const pdfTest = await getSetting<{ ok: boolean; detail: string; at: string } | null>("last_pdf_test", null);
  const photosOk = photoCount.filter((r) => r.ok === "ok").length;
  const photosFail = photoCount.filter((r) => r.ok !== "ok").length;
  const llm = llmProvider();
  const integrations = [
    {
      name: "IA para Viorita-bot y texto libre",
      ok: llmConfigured(),
      detail: llm ? `${llm.name === "gemini" ? "Google Gemini (plan gratuito)" : llm.name === "groq" ? "Groq (plan gratuito)" : "Claude"} · modelo ${llm.model}` : "Sin GEMINI_API_KEY ni GROQ_API_KEY: Viorita toma los datos y deriva a un asesor; el texto libre se interpreta con reglas.",
    },
    { name: "IA para redactar propuestas (Claude)", ok: aiConfigured(), detail: aiConfigured() ? `Modelo ${aiModel()}` : "Opcional y pago (ANTHROPIC_API_KEY). Sin ella se usan los textos del motor." },
    { name: "Email de avisos (SMTP)", ok: emailConfigured(), detail: emailConfigured() ? "Configurado" : "Sin SMTP: las solicitudes quedan registradas en el panel y no se informa como enviado ningún email." },
    ...mediaStatus().map((m) => ({ name: `${m.kind === "image" ? "Imágenes" : "Videos"}: ${m.name}`, ok: m.configured, detail: m.configured ? "Configurado" : "Sin credencial" })),
    { name: "Mapa interactivo", ok: process.env.NEXT_PUBLIC_MAP_STYLE_URL !== "none", detail: process.env.NEXT_PUBLIC_MAP_STYLE_URL || "OpenFreeMap (por defecto). Si falla, se muestra el mapa esquemático." },
    { name: "Rol de base de datos público aislado", ok: publicDbIsolated(), detail: publicDbIsolated() ? "Las páginas públicas no pueden leer el esquema interno." : "DATABASE_URL_PUBLIC no configurada (obligatoria en producción)." },
    { name: "Generación de PDF (Chromium)", ok: !!chromiumPath(), detail: chromiumPath() ?? "No encontrado: se ofrece imprimir desde el navegador." },
    { name: "Búsqueda de vuelos (API)", ok: false, detail: "No configurada en esta versión: enlaces de búsqueda + carga manual de tarifas. Adaptador previsto: Duffel." },
    { name: "Búsqueda de hoteles (API)", ok: false, detail: "No configurada en esta versión: carga manual con fuente. Adaptador previsto: LiteAPI." },
  ];
  const qr = pending ? await QRCode.toDataURL(totpUri(pending.value as string, staff.email)) : null;
  return (
    <>
      <PageHeader title="Ajustes" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Estado de integraciones" className="xl:col-span-2">
          <ul className="grid gap-2 text-sm md:grid-cols-2">
            {integrations.map((i) => (
              <li key={i.name} className="flex items-start gap-2 rounded-xl bg-sand p-2">
                <Badge tone={i.ok ? "success" : "warning"}>{i.ok ? "Activo" : "No configurado"}</Badge>
                <span>
                  <span className="font-semibold text-navy">{i.name}</span>
                  <span className="block text-xs text-muted">{i.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Fotos de destinos" className="xl:col-span-2">
          <p className="text-sm">
            Lugares emblemáticos con foto en caché: <strong>{photosOk}</strong>
            {photosFail ? <span className="text-muted"> · sin foto o con error: {photosFail}</span> : null}. Se buscan solas al iniciar el servidor y una vez por semana.
          </p>
          {photoRun && (
            <p className="mt-1 text-xs text-muted">
              Última búsqueda manual: {new Date(photoRun.at).toLocaleString("es-AR")} · {photoRun.found}/{photoRun.titles} con foto
              {photoRun.error ? ` · error: ${photoRun.error}` : ""}
              {photoRun.missing?.length ? ` · sin foto: ${photoRun.missing.slice(0, 12).join(", ")}${photoRun.missing.length > 12 ? "…" : ""}` : ""}
            </p>
          )}
          <form action={refreshPhotos} className="mt-3">
            <button className={smallBtn}>Volver a buscar fotos ahora</button>
          </form>
        </Panel>
        <Panel title="Prueba de PDF">
          <p className="text-sm text-muted">Genera un PDF de prueba en el servidor. Si falla, acá aparece el error exacto para corregirlo.</p>
          {pdfTest && (
            <p className={`mt-2 rounded-xl p-2 text-sm ${pdfTest.ok ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
              {new Date(pdfTest.at).toLocaleString("es-AR")}: {pdfTest.detail}
            </p>
          )}
          <form action={testPdf} className="mt-3">
            <button className={smallBtn}>Probar PDF ahora</button>
          </form>
        </Panel>
        <Panel title="Costo aproximado del viaje (se muestra al cliente)" className="xl:col-span-2">
          <p className="text-sm text-muted">Valores promedio de referencia en US$ para nivel «moderado». El sistema los ajusta por nivel de viaje, temporada alta (enero, julio y diciembre) y cantidad de viajeros. Actualizalos cuando cambien los precios del mercado.</p>
          <form action={saveTripEstimate} className="mt-3 grid gap-6 lg:grid-cols-2">
            <table className="text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="pr-3">Vuelo ida y vuelta desde Argentina, por persona</th>
                  <th className="pr-3">mín.</th>
                  <th>máx.</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(DEFAULT_TRIP_ESTIMATE.flights).map((r) => (
                  <tr key={r}>
                    <td className="pr-3 font-semibold text-navy">{SUPER_REGION_LABEL[r] ?? r}</td>
                    {[0, 1].map((j) => (
                      <td key={j} className="py-1 pr-3">
                        <input name={`f-${r}-${j === 0 ? "l" : "h"}`} type="number" min={1} defaultValue={est.flights[r]?.[j] ?? DEFAULT_TRIP_ESTIMATE.flights[r][j]} className={`${smallInput} w-24`} aria-label={`Vuelo ${r} ${j === 0 ? "mínimo" : "máximo"}`} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div>
              <table className="text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted">
                    <th className="pr-3">Hotel por noche (habitación doble)</th>
                    <th className="pr-3">mín.</th>
                    <th>máx.</th>
                  </tr>
                </thead>
                <tbody>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <tr key={i}>
                      <td className="pr-3 font-semibold text-navy">{["1 · Económico", "2", "3 · Medio", "4", "5 · Muy caro"][i]}</td>
                      {[0, 1].map((j) => (
                        <td key={j} className="py-1 pr-3">
                          <input name={`h-${i}-${j === 0 ? "l" : "h"}`} type="number" min={1} defaultValue={est.hotel[i]?.[j] ?? DEFAULT_TRIP_ESTIMATE.hotel[i][j]} className={`${smallInput} w-24`} aria-label={`Hotel nivel ${i + 1} ${j === 0 ? "mínimo" : "máximo"}`} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {owner && <button className={`${smallBtn} mt-3`}>Guardar valores</button>}
            </div>
          </form>
        </Panel>
        <Panel title="Gastos diarios orientativos (se muestran al cliente)">
          <p className="text-sm text-muted">Por persona y por día: comidas, transporte local y entradas (sin alojamiento ni vuelos). Según el nivel de costo de cada destino; luego se ajusta por el nivel de viaje elegido. Europa en euros, el resto en dólares.</p>
          <form action={saveDailySpend} className="mt-3 overflow-x-auto">
            <table className="text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="pr-3">Nivel de costo</th>
                  <th className="pr-3">US$ mín.</th>
                  <th className="pr-3">US$ máx.</th>
                  <th className="pr-3">€ mín.</th>
                  <th>€ máx.</th>
                </tr>
              </thead>
              <tbody>
                {[0, 1, 2, 3, 4].map((i) => (
                  <tr key={i}>
                    <td className="pr-3 font-semibold text-navy">{["1 · Económico", "2", "3 · Medio", "4", "5 · Muy caro"][i]}</td>
                    {(["USD", "EUR"] as const).flatMap((c) =>
                      [0, 1].map((j) => (
                        <td key={`${c}${j}`} className="py-1 pr-3">
                          <input name={`${c}-${i}-${j === 0 ? "l" : "h"}`} type="number" min={1} max={1999} defaultValue={spend[c][i]?.[j]} className={`${smallInput} w-20`} aria-label={`${c} ${j === 0 ? "mínimo" : "máximo"} nivel ${i + 1}`} />
                        </td>
                      )),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {owner && <button className={`${smallBtn} mt-3`}>Guardar valores</button>}
          </form>
        </Panel>
        <Panel title="Modelo de puntaje (ponderaciones base)">
          <form action={saveWeights} className="grid grid-cols-2 gap-2 text-sm">
            {CRITERIA.map((c) => (
              <label key={c} className="flex items-center justify-between gap-2">
                <span>{CRITERIA_LABELS[c]}</span>
                <input name={c} type="number" step="0.1" min={0} max={10} defaultValue={weights[c]} className={`${smallInput} w-20`} disabled={!owner} />
              </label>
            ))}
            {owner && <button className={`${smallBtn} col-span-2 w-fit`}>Guardar ponderaciones</button>}
          </form>
          <p className="mt-2 text-xs text-muted">Las prioridades de cada cliente multiplican estas ponderaciones. Los cambios aplican a propuestas nuevas o regeneradas.</p>
        </Panel>
        <Panel title="Generales y límites">
          <form action={saveGeneral} className="grid gap-2 text-sm">
            {[
              ["share_link_days", "Vencimiento de enlaces compartidos (días)", shareDays],
              ["draft_retention_days", "Retención de borradores sin contacto (días)", retention],
              ["ai_daily_limit", "Límite diario de llamadas a la IA", aiLimit],
              ["generations_per_ip_per_hour", "Generaciones por IP por hora", genLimit],
            ].map(([k, l, v]) => (
              <label key={k as string} className="flex items-center justify-between gap-2">
                <span>{l}</span>
                <input name={k as string} type="number" defaultValue={v as number} className={`${smallInput} w-24`} disabled={!owner} />
              </label>
            ))}
            {owner && <button className={`${smallBtn} w-fit`}>Guardar</button>}
          </form>
          {owner && (
            <form action={purgeExpired} className="mt-4">
              <button className={ghostBtn}>Aplicar política de retención ahora</button>
            </form>
          )}
        </Panel>
        <Panel title="Estados de proyecto">
          <ul className="space-y-1 text-sm">
            {statuses.map((s) => (
              <li key={s.key}>
                <form action={renameStatus.bind(null, s.key)} className="flex items-center gap-2">
                  <input name="label" defaultValue={s.label} className={`${smallInput} flex-1`} disabled={!owner} aria-label={`Nombre del estado ${s.key}`} />
                  {owner && <button className={ghostBtn}>Renombrar</button>}
                </form>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Seguridad de tu cuenta">
          {staff.totpEnabled ? (
            <Notice tone="success">Verificación en dos pasos activa.</Notice>
          ) : qr ? (
            <div className="space-y-3 text-sm">
              <p>Escaneá el código con tu app de autenticación (Google Authenticator, Authy, etc.) e ingresá el código de 6 dígitos.</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="Código QR para la verificación en dos pasos" width={180} height={180} />
              <form action={confirmTotp} className="flex gap-2">
                <input name="code" inputMode="numeric" maxLength={6} className={`${smallInput} w-28`} aria-label="Código" />
                <button className={smallBtn}>Activar</button>
              </form>
            </div>
          ) : (
            <form action={startTotp}>
              <Notice tone="warning" className="mb-2">Recomendado (obligatorio para propietarios): activá la verificación en dos pasos.</Notice>
              <button className={smallBtn}>Configurar verificación en dos pasos</button>
            </form>
          )}
        </Panel>
        {owner && (
          <Panel title="Usuarios del panel" className="xl:col-span-2">
            <ul className="divide-y divide-line text-sm">
              {users.map((u) => (
                <li key={u.id} className="flex flex-wrap items-center gap-2 py-2">
                  <span className="font-semibold">{u.name}</span>
                  <span className="text-muted">{u.email}</span>
                  <Badge>{u.role}</Badge>
                  {u.totpSecret && <Badge tone="success">2FA</Badge>}
                  {!u.active && <Badge tone="danger">Inactivo</Badge>}
                  {u.id !== staff.id && (
                    <form action={toggleUser.bind(null, u.id)} className="ml-auto">
                      <button className="text-xs font-semibold underline">{u.active ? "Desactivar" : "Activar"}</button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
            <form action={createUser} className="mt-3 grid gap-2 sm:grid-cols-5">
              <input name="name" placeholder="Nombre" className={smallInput} required aria-label="Nombre" />
              <input name="email" type="email" placeholder="Email" className={smallInput} required aria-label="Email" />
              <input name="password" type="password" placeholder="Contraseña (12+)" className={smallInput} required aria-label="Contraseña" />
              <select name="role" className={smallInput} aria-label="Rol">
                <option value="agent">Agente</option>
                <option value="viewer">Solo lectura</option>
                <option value="owner">Propietario</option>
              </select>
              <button className={smallBtn}>Crear usuario</button>
            </form>
          </Panel>
        )}
      </div>
    </>
  );
}
