"use client";

import { useEffect } from "react";

export function AutoPrint() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 800);
    return () => clearTimeout(t);
  }, []);
  return (
    <p className="no-print mb-4 rounded-xl bg-sand-2 p-3 text-sm text-navy">
      Para guardar en PDF, elegí «Guardar como PDF» en el diálogo de impresión.
    </p>
  );
}
