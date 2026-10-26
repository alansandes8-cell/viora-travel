"use client";

import Link from "next/link";
import { Notice } from "@/components/ui";

export default function PanelError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-xl font-semibold">No se pudo completar la acción</h1>
      <Notice tone="danger">
        {process.env.NODE_ENV === "development" ? error.message : "Revisá los datos ingresados. Recordá que los textos visibles para el cliente no pueden incluir precios y que algunas acciones requieren permisos de agente o propietario."}
        {error.digest && <span className="mt-1 block text-xs">Código: {error.digest}</span>}
      </Notice>
      <div className="flex gap-3">
        <button onClick={reset} className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">
          Reintentar
        </button>
        <Link href="/admin/proyectos" className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-navy">
          Volver a proyectos
        </Link>
      </div>
    </div>
  );
}
