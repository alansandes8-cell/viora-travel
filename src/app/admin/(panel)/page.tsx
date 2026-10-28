import Link from "next/link";
import QRCode from "qrcode";
import { ACTION_LABELS, PageHeader, Panel, Stat, fmtDateTime } from "@/components/admin/bits";
import { Badge } from "@/components/ui";
import { requireStaff } from "@/server/auth/session";
import { dashboardStats } from "@/server/services/admin";
import { agency } from "@/server/settings";

export const metadata = { title: "Panel" };

const TASK_STATUS: Record<string, string> = { pending: "Pendiente", in_progress: "En proceso", verified: "Verificada", done: "Completada" };

export default async function DashboardPage() {
  await requireStaff();
  const s = await dashboardStats();
  const appUrl = `${agency.appUrl()}/app`;
  const qr = await QRCode.toString(appUrl, { type: "svg", margin: 1, color: { dark: "#1b2a4a", light: "#ffffff" } });
  const waText = `¡Hola! Te paso la app de VIORA TRAVEL para planificar tu viaje: respondés unas preguntas y recibís tres alternativas pensadas para vos. ${appUrl}`;
  return (
    <>
      <PageHeader title="Panel de VIORA TRAVEL" subtitle="Resumen de proyectos, solicitudes y tareas." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <Stat label="Proyectos" value={s.counts.total} />
        <Stat label="Nuevos (30 días)" value={s.counts.last30} tone="teal" />
        <Stat label="Clientes nuevos" value={s.newClients} tone="cyan" />
        <Stat label="Propuestas generadas" value={s.proposals} tone="purple" />
        <Stat label="Enviadas" value={s.counts.sent} tone="orange" />
        <Stat label="Interesados" value={s.interested} tone="coral" />
        <Stat label="En cotización / confirmados" value={`${s.counts.quoting} / ${s.counts.confirmed}`} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Solicitudes de cotización recientes">
          {s.newRequests.length ? (
            <ul className="divide-y divide-line text-sm">
              {s.newRequests.map(({ r, code }) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <Link href={`/admin/proyectos/${r.projectId}`} className="font-semibold text-navy hover:underline">
                    {code} · {r.name}
                  </Link>
                  <span className="text-muted">{fmtDateTime(r.createdAt)}</span>
                  <Badge tone={r.notificationStatus === "sent" ? "success" : r.notificationStatus === "failed" ? "danger" : "neutral"}>
                    Aviso: {r.notificationStatus === "sent" ? "enviado" : r.notificationStatus === "failed" ? "falló" : "email no configurado"}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Todavía no hay solicitudes.</p>
          )}
        </Panel>
        <Panel title="Tareas pendientes">
          {s.tasks.length ? (
            <ul className="divide-y divide-line text-sm">
              {s.tasks.map(({ t, code }) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <Link href={`/admin/proyectos/${t.projectId}?tab=tareas`} className="min-w-0 flex-1 truncate text-navy hover:underline">
                    <span className="font-semibold">{code}</span> · {t.title}
                  </Link>
                  <Badge tone={t.status === "in_progress" ? "orange" : "neutral"}>{TASK_STATUS[t.status]}</Badge>
                  {t.dueDate && <span className="text-xs text-muted">vence {t.dueDate}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Sin tareas pendientes.</p>
          )}
        </Panel>
        <Panel title="Seguimientos de los próximos 7 días">
          {s.followUps.length ? (
            <ul className="divide-y divide-line text-sm">
              {s.followUps.map((p) => (
                <li key={p.id} className="flex justify-between gap-2 py-2">
                  <Link href={`/admin/proyectos/${p.id}`} className="font-semibold text-navy hover:underline">
                    {p.code} · {p.name}
                  </Link>
                  <span className="text-muted">{p.nextFollowUp}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Sin seguimientos programados.</p>
          )}
        </Panel>
        <Panel title="Últimas actividades">
          <ul className="divide-y divide-line text-sm">
            {s.recent.map(({ a, code }) => (
              <li key={a.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span>
                  {code ? (
                    <Link href={`/admin/proyectos/${a.projectId}`} className="font-semibold text-navy hover:underline">
                      {code}
                    </Link>
                  ) : (
                    <span className="text-muted">Sistema</span>
                  )}{" "}
                  · {ACTION_LABELS[a.action] ?? a.action}
                </span>
                <span className="text-xs text-muted">{fmtDateTime(a.createdAt)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <Panel title="Contactos de Viorita (asistente de la web)" className="mt-6">
        {s.chats.length ? (
          <ul className="divide-y divide-line text-sm">
            {s.chats.map(({ c, client }) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                {client ? (
                  <Link href={`/admin/clientes/${client.id}`} className="font-semibold text-navy hover:underline">
                    {client.name ?? "Anonimizado"}
                  </Link>
                ) : (
                  <span>—</span>
                )}
                <span className="text-muted">{[client?.phone, client?.email].filter(Boolean).join(" · ")}</span>
                <span className="w-full truncate text-muted sm:w-auto sm:max-w-md">«{c.messages.find((m) => m.role === "user")?.content}»</span>
                <span className="text-xs text-muted">{fmtDateTime(c.updatedAt)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Todavía no hay contactos. Cuando alguien chatee con Viorita, aparece acá con su nombre, email y WhatsApp.</p>
        )}
      </Panel>
      <Panel title="App para clientes" className="mt-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="w-32 shrink-0 rounded-xl border border-line p-2" role="img" aria-label="Código QR de la app" dangerouslySetInnerHTML={{ __html: qr }} />
          <div className="space-y-2 text-sm">
            <p>
              Los clientes instalan VIORA desde <a href={appUrl} className="font-semibold text-navy underline" target="_blank" rel="noopener noreferrer">{appUrl}</a> (Android: «Instalar app»; iPhone: Compartir → «Agregar a inicio»). Podés mostrarles este QR o mandarles el link.
            </p>
            <a href={`https://wa.me/?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center rounded-full bg-teal-brand px-4 py-2 font-semibold text-white hover:bg-teal-brand/90">
              Enviar por WhatsApp
            </a>
            <p className="text-muted">Para tener el panel como app en tu celu: abrí /admin en el navegador del celu e instalalo igual («VIORA Panel»).</p>
          </div>
        </div>
      </Panel>
    </>
  );
}
