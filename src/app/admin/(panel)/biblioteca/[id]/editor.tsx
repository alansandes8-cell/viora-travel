"use client";

import { useActionState } from "react";
import { Notice } from "@/components/ui";
import { saveDestination } from "../actions";

export function DestinationEditor({ id, json, canEdit }: { id: string; json: string; canEdit: boolean }) {
  const [state, action, pending] = useActionState(saveDestination.bind(null, id), { error: "" } as { error: string; ok?: boolean });
  return (
    <form action={action} className="space-y-3">
      <textarea name="json" defaultValue={json} rows={32} spellCheck={false} className="w-full rounded-xl border border-line bg-white p-3 font-mono text-xs" readOnly={!canEdit} aria-label="Datos del destino" />
      {state.error && <Notice tone="danger">{state.error}</Notice>}
      {state.ok && <Notice tone="success">Guardado. El motor usa la nueva versión desde ahora.</Notice>}
      {canEdit && (
        <button className="rounded-full bg-navy px-5 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={pending}>
          {pending ? "Guardando…" : "Guardar destino"}
        </button>
      )}
    </form>
  );
}
