import "server-only";
import ExcelJS from "exceljs";
import { computeQuote, QUOTE_CATEGORY_LABELS, type QuoteCategory } from "@/core/pricing";
import { VERIFICATION_LABELS } from "@/core/types";
import type { projectBundle } from "./services/admin";

type Bundle = NonNullable<Awaited<ReturnType<typeof projectBundle>>>;

const OBS: Record<string, string> = { consulted_real: "Precio real consultado", observed_on_date: "Observado en fecha", reference_estimate: "Estimación de referencia", historical: "Dato histórico", unavailable: "No disponible" };

export function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  // Evita inyección de fórmulas al abrir el CSV en planillas.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function componentsCsv(b: Bundle): string {
  const head = ["Categoría", "Descripción", "Desde", "Hasta", "Pax", "Especificaciones", "Proveedor", "Fuente", "Estado"];
  const rows = b.components.map((c) => [QUOTE_CATEGORY_LABELS[c.category as QuoteCategory] ?? c.category, c.description, c.dateFrom, c.dateTo, c.pax, c.specs, c.supplier, c.sourceUrl, c.verification]);
  return "﻿" + [head, ...rows].map((r) => r.map(csvEscape).join(";")).join("\n");
}

export async function projectXlsx(b: Bundle): Promise<Buffer> {
  const doc = b.current!.document;
  const it = doc.itinerary;
  const wb = new ExcelJS.Workbook();
  wb.creator = "VIORA TRAVEL";
  wb.created = new Date();
  const header = (ws: ExcelJS.Worksheet) => {
    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1B2A4A" } };
  };

  const s = wb.addWorksheet("Resumen");
  s.columns = [{ header: "Campo", key: "k", width: 30 }, { header: "Valor", key: "v", width: 90 }];
  header(s);
  [
    ["Proyecto", `${b.project.code} — ${b.project.name}`],
    ["Cliente", b.client ? `${b.client.name ?? ""} ${b.client.email ?? ""} ${b.client.phone ?? ""}` : "Sin contacto"],
    ["Fechas", b.project.tentativeDates],
    ["Viajeros", doc.profile.travelers],
    ["Nivel de presupuesto", doc.profile.budgetTier],
    ["Presupuesto declarado (interno)", b.budget?.amount ? `${b.budget.currency} ${b.budget.amount} ${b.budget.per}` : "—"],
    ["Alternativa elegida", doc.alternatives.find((a) => a.id === doc.selectedAlternativeId)?.title],
    ["Versión", `v${b.current!.number}`],
    ["Generado", new Date().toLocaleString("es-AR")],
  ].forEach(([k, v]) => s.addRow({ k, v }));

  const i = wb.addWorksheet("Itinerario");
  i.columns = [
    { header: "Día", key: "n", width: 6 },
    { header: "Fecha", key: "date", width: 12 },
    { header: "Lugar", key: "place", width: 20 },
    { header: "Plan", key: "title", width: 40 },
    { header: "Actividades", key: "acts", width: 70 },
    { header: "Logística", key: "log", width: 50 },
  ];
  header(i);
  it?.days.forEach((d) => i.addRow({ n: d.n, date: d.date ?? "", place: it.stops.find((x) => x.id === d.stopId)?.name, title: d.title, acts: d.activities.map((a) => `${a.name} (${a.hours}h${a.booking === "required" ? ", reserva" : ""})`).join("; "), log: d.logistics ?? "" }));

  const c = wb.addWorksheet("Componentes");
  c.columns = [
    { header: "Categoría", key: "cat", width: 24 },
    { header: "Descripción", key: "desc", width: 50 },
    { header: "Desde", key: "from", width: 12 },
    { header: "Hasta", key: "to", width: 12 },
    { header: "Pax", key: "pax", width: 6 },
    { header: "Especificaciones", key: "specs", width: 30 },
    { header: "Proveedor", key: "sup", width: 20 },
    { header: "Estado", key: "ver", width: 14 },
    { header: "Importe (completar)", key: "amount", width: 18 },
    { header: "Moneda", key: "cur", width: 8 },
  ];
  header(c);
  b.components.forEach((x) => c.addRow({ cat: QUOTE_CATEGORY_LABELS[x.category as QuoteCategory], desc: x.description, from: x.dateFrom, to: x.dateTo, pax: x.pax, specs: x.specs, sup: x.supplier, ver: x.verification }));
  const last = b.components.length + 1;
  c.addRow({});
  const totalRow = c.addRow({ desc: "Total (fórmula)", amount: { formula: `SUM(I2:I${last})` } });
  totalRow.font = { bold: true };

  const o = wb.addWorksheet("Consultas económicas");
  o.columns = [
    { header: "Tipo", key: "kind", width: 24 },
    { header: "Proveedor", key: "prov", width: 20 },
    { header: "Consultado", key: "at", width: 20 },
    { header: "Viaje", key: "trip", width: 22 },
    { header: "Pax", key: "pax", width: 6 },
    { header: "Moneda", key: "cur", width: 8 },
    { header: "Importe", key: "amount", width: 14 },
    { header: "Incluye", key: "inc", width: 30 },
    { header: "No incluye", key: "exc", width: 30 },
    { header: "Vigencia", key: "valid", width: 20 },
    { header: "Enlace", key: "url", width: 40 },
  ];
  header(o);
  b.observations.forEach((x) => o.addRow({ kind: OBS[x.kind], prov: x.provider, at: x.observedAt.toLocaleString("es-AR"), trip: `${x.travelFrom ?? ""} → ${x.travelTo ?? ""}`, pax: x.pax, cur: x.currency, amount: x.amount ? Number(x.amount) : null, inc: x.includes, exc: x.excludes, valid: x.validUntil?.toLocaleString("es-AR") ?? "desconocida", url: x.url }));

  for (const q of b.quotes) {
    const ws = wb.addWorksheet(`Presupuesto ${q.currency} ${q.id.slice(0, 4)}`);
    ws.columns = [
      { header: "Categoría", key: "cat", width: 24 },
      { header: "Descripción", key: "desc", width: 40 },
      { header: "Cantidad", key: "qty", width: 10 },
      { header: "Importe unitario", key: "unit", width: 16 },
      { header: "Moneda", key: "cur", width: 8 },
      { header: "Tipo de cambio", key: "fx", width: 14 },
      { header: "× pax", key: "pax", width: 8 },
      { header: `Total ${q.currency}`, key: "total", width: 16 },
    ];
    header(ws);
    const lines = b.quoteLines.filter((l) => l.quoteId === q.id);
    lines.forEach((l, idx) => {
      const r = idx + 2;
      ws.addRow({ cat: QUOTE_CATEGORY_LABELS[l.category as QuoteCategory], desc: l.description, qty: Number(l.quantity), unit: Number(l.unitAmount), cur: l.currency, fx: l.currency === q.currency ? 1 : l.fxRate ? Number(l.fxRate) : null, pax: l.perPerson ? q.travelers : 1, total: { formula: `C${r}*D${r}*F${r}*G${r}` } });
    });
    const n = lines.length + 1;
    const r = computeQuote({ currency: q.currency, travelers: q.travelers, lines: lines.map((l) => ({ id: l.id, category: l.category as QuoteCategory, description: l.description, quantity: l.quantity, unitAmount: l.unitAmount, currency: l.currency, fxRate: l.fxRate ?? undefined, perPerson: l.perPerson })), taxes: q.taxes, marginPercent: q.marginPercent ?? undefined, managementFee: q.managementFee ?? undefined });
    ws.addRow({});
    ws.addRow({ desc: "Total servicios", total: { formula: `SUM(H2:H${n})`, result: Number(r.servicesTotal) } });
    ws.addRow({ desc: `Impuestos y cargos (${q.taxes.map((t) => `${t.label} ${t.value}${t.mode === "percent" ? "%" : ""}`).join(", ") || "ninguno"})`, total: Number(r.taxesTotal) });
    ws.addRow({ desc: `Margen ${q.marginPercent ?? 0}%`, total: Number(r.marginAmount) });
    ws.addRow({ desc: "Cargo de gestión", total: Number(r.managementFee) });
    ws.addRow({ desc: "Precio final", total: Number(r.finalPrice) }).font = { bold: true };
    ws.addRow({ desc: "Por persona", total: Number(r.perPerson) });
    ws.addRow({ desc: `Tipo de cambio: ${q.fxNote ?? "—"} (${q.fxDate ?? "sin fecha"}) · Vigencia: ${q.validUntil ?? "—"}` });
  }

  const f = wb.addWorksheet("Fuentes y verificación");
  f.columns = [{ header: "Dato", key: "d", width: 50 }, { header: "Estado", key: "s", width: 28 }, { header: "Fuente / fecha", key: "f", width: 70 }];
  header(f);
  it?.legs.forEach((l) => f.addRow({ d: `Traslado ${l.fromName} → ${l.toName}`, s: VERIFICATION_LABELS[l.duration.status], f: [...(l.duration.sources ?? []).map((x) => `${x.url ?? x.label} ${x.checkedAt?.slice(0, 10) ?? ""}`), ...l.operators.map((o2) => o2.url)].join(" | ") }));
  doc.alternatives.forEach((a) => f.addRow({ d: `Clima ${a.title}`, s: VERIFICATION_LABELS[a.climateNote.status], f: "Biblioteca VIORA (valores aproximados)" }));
  doc.entryRequirements.forEach((e) => f.addRow({ d: `Requisitos ${e.country}`, s: VERIFICATION_LABELS.pending, f: e.links.map((l) => l.url).join(" | ") }));

  return Buffer.from(await wb.xlsx.writeBuffer());
}
