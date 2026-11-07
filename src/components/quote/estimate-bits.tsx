import { Info } from "lucide-react";
import { cx } from "@/components/ui";

export const usd = (n: number) => `US$ ${Math.round(n).toLocaleString("es-AR")}`;
export const usdRange = ([a, b]: [number, number]) => `${usd(a)} – ${Math.round(b).toLocaleString("es-AR")}`;

export function fmtDay(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** Aviso que acompaña a todo precio estimado. */
export function EstimateNote({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <p className={cx("flex items-start gap-2 rounded-xl bg-sand-2 px-3 py-2 text-xs text-muted", className)}>
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-navy" aria-hidden />
      <span>
        {children ??
          "Precios estimados de referencia en dólares, calculados con valores promedio de mercado y con margen. No son una cotización: la tarifa real depende de la disponibilidad del día. No incluyen percepciones o impuestos argentinos que puedan aplicar según el medio de pago."}
      </span>
    </p>
  );
}

export const isoParam = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");
export const intParam = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Number(typeof v === "string" ? v : NaN);
  return Number.isInteger(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
