import { Panel, fmtDateTime, ghostBtn, smallBtn, smallInput } from "@/components/admin/bits";
import { Badge, Notice } from "@/components/ui";
import { addNote, addSuggestedTasks, addTask, deleteTask, runCriticReview, runEnhanceTexts, runResearch, setTaskStatus } from "../actions";
import type { Bundle } from "./types";

const STATUS = { pending: "Pendiente", in_progress: "En proceso", verified: "Verificada", done: "Completada" } as Record<string, string>;
const KIND = { note: "Nota", decision: "Decisión", comment: "Comentario", client_change: "Pedido del cliente" } as Record<string, string>;

export function TabTareas({ id, b, canEdit, ai }: { id: string; b: Bundle; canEdit: boolean; ai: boolean }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Panel
        title="Tareas para preparar la cotización"
        actions={
          canEdit ? (
            <form action={addSuggestedTasks.bind(null, id)}>
              <button className={ghostBtn}>Sugerir tareas faltantes</button>
            </form>
          ) : null
        }
      >
        <ol className="space-y-2">
          {b.tasks.map((t, i) => (
            <li key={t.id} className="rounded-xl border border-line p-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-5 text-muted">{i + 1}.</span>
                <span className={`flex-1 font-semibold ${t.status === "done" ? "text-muted line-through" : ""}`}>{t.title}</span>
                {t.origin === "suggested" && <Badge tone="purple">Sugerida</Badge>}
                {t.dueDate && <span className="text-xs text-muted">vence {t.dueDate}</span>}
                <form action={setTaskStatus.bind(null, id, t.id)} className="flex gap-1">
                  <select name="status" defaultValue={t.status} className={smallInput} aria-label="Estado" disabled={!canEdit}>
                    {Object.entries(STATUS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                  {canEdit && <button className={ghostBtn}>OK</button>}
                </form>
                {canEdit && (
                  <form action={deleteTask.bind(null, id, t.id)}>
                    <button className="text-xs text-danger underline">Borrar</button>
                  </form>
                )}
              </div>
              {t.detail && <p className="ml-7 mt-1 text-xs text-muted">{t.detail}</p>}
            </li>
          ))}
        </ol>
        {canEdit && (
          <form action={addTask.bind(null, id)} className="mt-3 grid gap-2 sm:grid-cols-[2fr_1fr_auto]">
            <input name="title" placeholder="Nueva tarea" className={smallInput} required aria-label="Nueva tarea" />
            <input name="dueDate" type="date" className={smallInput} aria-label="Vencimiento" />
            <button className={smallBtn}>Agregar</button>
            <input name="detail" placeholder="Detalle (opcional)" className={`${smallInput} sm:col-span-3`} aria-label="Detalle" />
          </form>
        )}
      </Panel>
      <div className="space-y-6">
        <Panel title="Notas internas y decisiones">
          {canEdit && (
            <form action={addNote.bind(null, id)} className="mb-3 grid gap-2">
              <textarea name="text" rows={3} placeholder="Nota privada, decisión comercial, comentario…" className={smallInput} required aria-label="Nota" />
              <div className="flex gap-2">
                <select name="kind" className={smallInput} aria-label="Tipo">
                  <option value="note">Nota</option>
                  <option value="decision">Decisión</option>
                  <option value="comment">Comentario</option>
                </select>
                <button className={smallBtn}>Guardar nota</button>
              </div>
            </form>
          )}
          <ul className="space-y-2">
            {b.notes.map((n) => (
              <li key={n.id} className="rounded-xl bg-sand p-3 text-sm">
                <p className="text-xs text-muted">
                  <Badge>{KIND[n.kind] ?? n.kind}</Badge> {fmtDateTime(n.createdAt)}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{n.text}</p>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Asistencia con IA">
          {!ai ? (
            <Notice>La IA no está configurada (falta ANTHROPIC_API_KEY). El sistema funciona con el motor determinista; estas herramientas quedan deshabilitadas.</Notice>
          ) : canEdit ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <form action={runCriticReview.bind(null, id)}>
                  <button className={ghostBtn}>Revisión crítica de la propuesta</button>
                </form>
                <form action={runEnhanceTexts.bind(null, id)}>
                  <button className={ghostBtn}>Mejorar textos (nueva versión)</button>
                </form>
              </div>
              <form action={runResearch.bind(null, id)} className="flex gap-2">
                <input name="topic" placeholder="Investigar: «tren Lisboa–Sevilla en mayo», «requisitos de ingreso a Japón»…" className={`${smallInput} flex-1`} aria-label="Tema a investigar" />
                <button className={smallBtn}>Investigar</button>
              </form>
              <p className="text-xs text-muted">Cada uso tiene costo. Los resultados se guardan como notas con fuentes y fecha de consulta; verificalos antes de usarlos como dato confirmado.</p>
            </div>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
