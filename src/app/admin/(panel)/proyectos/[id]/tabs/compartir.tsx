import { Panel, fmtDateTime, smallBtn, smallInput } from "@/components/admin/bits";
import { Badge, Notice } from "@/components/ui";
import { createAgentShareLink, revokeLink } from "../actions";
import type { Bundle } from "./types";

export function TabCompartir({ id, b, canEdit }: { id: string; b: Bundle; canEdit: boolean }) {
  const now = new Date();
  return (
    <div className="space-y-6">
      <Notice>
        Los enlaces privados muestran una instantánea saneada: la propuesta inspiracional nunca incluye precios. El token completo solo se muestra una vez (queda registrado en las notas del proyecto) y en la base solo se guarda su huella.
      </Notice>
      {canEdit && (
        <form action={createAgentShareLink.bind(null, id)} className="flex flex-wrap items-end gap-2">
          <label className="text-sm">
            Vence en (días)
            <input name="days" type="number" defaultValue={30} min={1} max={365} className={`${smallInput} ml-2 w-20`} />
          </label>
          <button className={smallBtn}>Crear enlace para el cliente con la versión publicada</button>
        </form>
      )}
      <Panel title="Enlaces">
        {b.links.length ? (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted">
              <tr>
                <th>Tipo</th>
                <th>Creado por</th>
                <th>Creado</th>
                <th>Vence</th>
                <th>Accesos</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {b.links.map((l) => {
                const active = !l.revokedAt && l.expiresAt > now;
                return (
                  <tr key={l.id} className="border-t border-line/60">
                    <td className="py-1.5">{l.kind === "priced_proposal" ? "Propuesta con precios" : "Propuesta (sin precios)"}</td>
                    <td className="py-1.5">{l.createdBy.startsWith("staff") ? "Agencia" : "Cliente"}</td>
                    <td className="py-1.5 text-xs">{fmtDateTime(l.createdAt)}</td>
                    <td className="py-1.5 text-xs">{fmtDateTime(l.expiresAt)}</td>
                    <td className="py-1.5">{l.accessCount}{l.lastAccessAt ? <span className="text-xs text-muted"> · último {fmtDateTime(l.lastAccessAt)}</span> : null}</td>
                    <td className="py-1.5">
                      <Badge tone={active ? "success" : "danger"}>{l.revokedAt ? "Revocado" : active ? "Activo" : "Vencido"}</Badge>
                    </td>
                    <td className="py-1.5 text-right">
                      {canEdit && active && (
                        <form action={revokeLink.bind(null, id, l.id)}>
                          <button className="text-xs font-semibold text-danger underline">Revocar</button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-muted">Sin enlaces creados.</p>
        )}
      </Panel>
    </div>
  );
}
