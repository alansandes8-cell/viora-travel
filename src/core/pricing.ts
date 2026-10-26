import Decimal from "decimal.js";

/**
 * Cálculo de presupuesto interno. SOLO para el panel de la agencia.
 * No asume márgenes, impuestos, comisiones ni tipos de cambio: todo lo provee el agente.
 */

export const QUOTE_CATEGORIES = [
  "flight_out",
  "flight_back",
  "flight_internal",
  "train",
  "bus",
  "ferry",
  "transfer",
  "lodging",
  "meals",
  "excursion",
  "tickets",
  "car_rental",
  "insurance",
  "other",
] as const;
export type QuoteCategory = (typeof QUOTE_CATEGORIES)[number];

export const QUOTE_CATEGORY_LABELS: Record<QuoteCategory, string> = {
  flight_out: "Vuelo internacional de ida",
  flight_back: "Vuelo internacional de regreso",
  flight_internal: "Vuelos internos",
  train: "Trenes",
  bus: "Autobuses",
  ferry: "Ferris",
  transfer: "Traslados",
  lodging: "Alojamiento",
  meals: "Régimen de comidas",
  excursion: "Excursiones",
  tickets: "Entradas",
  car_rental: "Alquiler de auto",
  insurance: "Seguro de viaje",
  other: "Otros servicios",
};

export interface QuoteLineInput {
  id: string;
  category: QuoteCategory;
  description: string;
  quantity: string; // decimal
  unitAmount: string; // decimal, en la moneda de la línea
  currency: string;
  fxRate?: string; // multiplicador hacia la moneda de la cotización (1 si es la misma)
  perPerson?: boolean; // si es por persona, se multiplica por viajeros
}

export interface QuoteInput {
  currency: string;
  travelers: number;
  lines: QuoteLineInput[];
  taxes: { label: string; mode: "percent" | "fixed"; value: string }[];
  marginPercent?: string; // editable, sin valor por defecto
  managementFee?: string; // cargo fijo de gestión
}

export interface QuoteResult {
  ok: boolean;
  errors: string[];
  byCategory: { category: QuoteCategory; label: string; subtotal: string }[];
  lines: { id: string; total: string; formula: string }[];
  servicesTotal: string;
  taxesTotal: string;
  taxes: { label: string; amount: string; formula: string }[];
  marginAmount: string;
  managementFee: string;
  finalPrice: string;
  perPerson: string;
  currency: string;
}

const D = (v: string | undefined, fallback = "0") => {
  try {
    return new Decimal(v === undefined || v === "" ? fallback : v.replace(",", "."));
  } catch {
    return null;
  }
};
const fmt = (d: Decimal) => d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);

export function computeQuote(q: QuoteInput): QuoteResult {
  const errors: string[] = [];
  const byCat = new Map<QuoteCategory, Decimal>();
  const lines: QuoteResult["lines"] = [];
  let services = new Decimal(0);
  for (const l of q.lines) {
    const qty = D(l.quantity, "1");
    const unit = D(l.unitAmount);
    const fx = l.currency === q.currency ? new Decimal(1) : D(l.fxRate);
    if (!qty || !unit) {
      errors.push(`Línea «${l.description}»: cantidad o importe inválido.`);
      continue;
    }
    if (!fx || (l.currency !== q.currency && (!l.fxRate || fx.lte(0)))) {
      errors.push(`Línea «${l.description}»: falta el tipo de cambio ${l.currency} → ${q.currency}.`);
      continue;
    }
    const pax = l.perPerson ? new Decimal(q.travelers) : new Decimal(1);
    const total = qty.mul(unit).mul(fx).mul(pax);
    services = services.add(total);
    byCat.set(l.category, (byCat.get(l.category) ?? new Decimal(0)).add(total));
    lines.push({
      id: l.id,
      total: fmt(total),
      formula: `${qty} × ${unit} ${l.currency}${l.currency !== q.currency ? ` × ${fx} (TC)` : ""}${l.perPerson ? ` × ${q.travelers} pax` : ""}`,
    });
  }
  let taxesTotal = new Decimal(0);
  const taxes: QuoteResult["taxes"] = [];
  for (const t of q.taxes) {
    const v = D(t.value);
    if (!v) {
      errors.push(`Impuesto «${t.label}» inválido.`);
      continue;
    }
    const amount = t.mode === "percent" ? services.mul(v).div(100) : v;
    taxesTotal = taxesTotal.add(amount);
    taxes.push({ label: t.label, amount: fmt(amount), formula: t.mode === "percent" ? `${v}% sobre servicios` : "importe fijo" });
  }
  const marginPct = q.marginPercent ? D(q.marginPercent) : new Decimal(0);
  if (!marginPct) errors.push("Margen inválido.");
  const marginAmount = services.add(taxesTotal).mul(marginPct ?? 0).div(100);
  const fee = D(q.managementFee) ?? new Decimal(0);
  const final = services.add(taxesTotal).add(marginAmount).add(fee);
  const perPerson = q.travelers > 0 ? final.div(q.travelers) : final;
  return {
    ok: errors.length === 0,
    errors,
    byCategory: [...byCat.entries()].map(([c, v]) => ({ category: c, label: QUOTE_CATEGORY_LABELS[c], subtotal: fmt(v) })),
    lines,
    servicesTotal: fmt(services),
    taxesTotal: fmt(taxesTotal),
    taxes,
    marginAmount: fmt(marginAmount),
    managementFee: fmt(fee),
    finalPrice: fmt(final),
    perPerson: fmt(perPerson),
    currency: q.currency,
  };
}
