import { MONTHS_ES } from "@/core/catalog";
import { modeLabel } from "@/core/itinerary";
import { computeQuote, QUOTE_CATEGORY_LABELS, type QuoteCategory } from "@/core/pricing";
import { CRITERIA, CRITERIA_LABELS, VERIFICATION_LABELS } from "@/core/types";
import type { Bundle } from "@/app/admin/(panel)/proyectos/[id]/tabs/types";
import { Logo } from "@/components/ui";

const OBS: Record<string, string> = { consulted_real: "Precio real consultado", observed_on_date: "Observado en fecha", reference_estimate: "Estimación de referencia", historical: "Dato histórico", unavailable: "No disponible" };

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 mt-8 border-b-2 border-navy pb-1 text-lg font-semibold">{children}</h2>;
}

/** Informe interno detallado para preparar la cotización. Solo para el panel. */
export function InternalReport({ b }: { b: Bundle }) {
  const doc = b.current!.document;
  const it = doc.itinerary;
  const p = b.project;
  const now = new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
  return (
    <article className="mx-auto max-w-4xl bg-white p-6 text-[13px] leading-relaxed text-ink">
      <header className="flex items-center justify-between">
        <Logo size={150} />
        <div className="text-right text-xs text-muted">
          <p className="font-bold uppercase text-danger">Documento interno · confidencial</p>
          <p>Generado el {now}</p>
          <p>Versión v{b.current!.number}</p>
        </div>
      </header>
      <h1 className="mt-4 text-2xl font-semibold">
        {p.code} — {p.name}
      </h1>

      <H>A. Resumen ejecutivo</H>
      <table className="w-full">
        <tbody>
          {[
            ["Creado", p.createdAt.toLocaleString("es-AR")],
            ["Cliente", b.client ? `${b.client.name ?? ""} · ${b.client.email ?? ""} · ${b.client.phone ?? ""}` : "Sin datos de contacto"],
            ["Perfil", doc.profile.declared.map((d) => `${d.label}: ${d.value}`).join(" · ")],
            ["Objetivo", doc.concept],
            ["Prioridades", `${doc.profile.priorities.join(", ") || "—"}${doc.profile.mustHave.length ? ` (indispensables: ${doc.profile.mustHave.join(", ")})` : ""}`],
            ["Fechas", `${p.tentativeDates ?? "—"}${doc.profile.exploratory ? " · no confirmadas" : ""}`],
            ["Personas", `${doc.profile.travelers}${doc.profile.kids.length ? ` (menores: ${doc.profile.kids.join(", ")})` : ""}`],
            ["Presupuesto orientativo", `Nivel ${doc.profile.budgetTier}${b.budget?.amount ? ` · ${b.budget.currency} ${b.budget.amount} ${b.budget.per === "person" ? "por persona" : "por grupo"}` : ""}`],
            ["Flexibilidad", doc.profile.flexibleDays ? `± ${doc.profile.flexibleDays} días` : "Fechas fijas"],
            ["Restricciones", [doc.profile.reducedMobility && "movilidad reducida", doc.profile.noCar && "sin auto", doc.profile.avoidHotelChanges && "pocos cambios de hotel"].filter(Boolean).join(", ") || "—"],
          ].map(([k, v]) => (
            <tr key={k} className="border-b border-line/60 align-top">
              <td className="w-48 py-1 font-semibold">{k}</td>
              <td className="py-1">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <H>B. Análisis de destinos</H>
      {doc.alternatives.map((a, i) => (
        <div key={a.id} className="avoid-break mb-4">
          <p className="font-semibold">
            {String.fromCharCode(65 + i)}. {a.title} — compatibilidad {a.compatibility}/100 {doc.selectedAlternativeId === a.id ? "(elegida)" : ""} · {a.labels.join(" · ")}
          </p>
          <p>{a.mainReason}</p>
          <table className="mt-1 w-full text-xs">
            <tbody>
              {CRITERIA.map((c) => (
                <tr key={c} className="border-b border-line/40 align-top">
                  <td className="w-52 py-0.5">{CRITERIA_LABELS[c]}</td>
                  <td className="w-16 py-0.5">{a.scores[c].value} (×{a.scores[c].weight})</td>
                  <td className="py-0.5 text-muted">{a.scores[c].factors.map((f) => `${f.sign} ${f.text}`).join(" · ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1">
            <strong>Ventajas:</strong> {a.pros.join("; ")}. <strong>Desventajas:</strong> {a.cons.join("; ") || "—"}.
          </p>
          <p>
            <strong>Clima ({VERIFICATION_LABELS[a.climateNote.status]}):</strong> {a.climateNote.value}
          </p>
          {a.warnings.length > 0 && <p><strong>Observaciones:</strong> {a.warnings.join(" ")}</p>}
        </div>
      ))}
      <p className="text-xs text-muted">Ponderaciones: {doc.weightNotes.join(" ") || "base"}. Puntajes orientativos del sistema.</p>

      {it && (
        <>
          <H>C. Itinerario detallado</H>
          <p>
            Ruta: {it.stops.map((s) => `${s.name} (${s.nights} n${s.arrivalDate ? `, ${s.arrivalDate}→${s.departureDate}` : ""}, zona ${s.lodgingZone ?? "—"})`).join(" → ")}
          </p>
          <p>
            Vuelos: {it.flights.originAirports.join("/")} → {it.flights.destinationAirports.join("/")} · regreso desde {it.flights.returnAirports.join("/")}
          </p>
          <table className="mt-2 w-full text-xs">
            <thead>
              <tr className="text-left text-muted">
                <th>Día</th>
                <th>Fecha</th>
                <th>Lugar</th>
                <th>Plan</th>
                <th>Traslados / notas</th>
              </tr>
            </thead>
            <tbody>
              {it.days.map((d) => (
                <tr key={d.id} className="avoid-break border-b border-line/40 align-top">
                  <td className="py-1 font-semibold">{d.n}</td>
                  <td className="py-1">{d.date ?? "—"}</td>
                  <td className="py-1">{it.stops.find((s) => s.id === d.stopId)?.name}</td>
                  <td className="py-1">
                    <p className="font-semibold">{d.title}</p>
                    {d.activities.map((a) => (
                      <p key={a.id}>
                        • {a.name} ({a.hours} h{a.booking === "required" ? ", requiere reserva" : a.booking === "recommended" ? ", reserva recomendada" : ""}){a.url ? ` — ${a.url}` : ""}
                      </p>
                    ))}
                    {d.rainPlan && <p className="text-muted">{d.rainPlan}</p>}
                  </td>
                  <td className="py-1 text-muted">{d.logistics ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 font-semibold">Traslados</p>
          {it.legs.map((l) => (
            <p key={l.id}>
              {l.fromName} → {l.toName}: {modeLabel(l.mode)}, {l.duration.value ?? "?"} h ({VERIFICATION_LABELS[l.duration.status]}) {l.operators.map((o) => `${o.name} ${o.url}`).join(", ")}
            </p>
          ))}
          <p className="mt-2 font-semibold">Alojamiento</p>
          {it.lodging.map((l) => (
            <p key={l.id}>
              {it.stops.find((s) => s.id === l.stopId)?.name}: {l.category}, zona {l.zone}. {l.options.map((o) => `${o.name}${o.url ? ` (${o.url})` : ""}`).join("; ")}
            </p>
          ))}
          <p className="mt-2 font-semibold">Validaciones</p>
          {doc.checks.length ? doc.checks.map((c, i) => <p key={i}>[{c.severity}] {c.message}</p>) : <p>Sin observaciones.</p>}
        </>
      )}

      <H>D. Componentes para cotizar</H>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-muted">
            <th>Categoría</th>
            <th>Descripción</th>
            <th>Fechas</th>
            <th>Pax</th>
            <th>Especificaciones</th>
            <th>Proveedor/fuente</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {b.components.map((c) => (
            <tr key={c.id} className="border-b border-line/40 align-top">
              <td className="py-0.5">{QUOTE_CATEGORY_LABELS[c.category as QuoteCategory]}</td>
              <td className="py-0.5">{c.description}</td>
              <td className="py-0.5">{c.dateFrom ?? ""}{c.dateTo ? `→${c.dateTo}` : ""}</td>
              <td className="py-0.5">{c.pax}</td>
              <td className="py-0.5">{c.specs}</td>
              <td className="py-0.5">{c.supplier} {c.sourceUrl}</td>
              <td className="py-0.5">{c.verification}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {b.observations.length > 0 && (
        <>
          <p className="mt-3 font-semibold">Consultas económicas</p>
          {b.observations.map((o) => (
            <p key={o.id} className="text-xs">
              [{OBS[o.kind]}] {o.provider ?? ""} · consultado {o.observedAt.toLocaleString("es-AR")} · {o.currency ?? ""} {o.amount ?? "—"} · viaje {o.travelFrom ?? "?"}→{o.travelTo ?? "?"} · pax {o.pax ?? "?"} · incluye: {o.includes ?? "—"} · no incluye: {o.excludes ?? "—"} · vigencia: {o.validUntil ? o.validUntil.toLocaleString("es-AR") : "desconocida"} {o.url ?? ""}
            </p>
          ))}
        </>
      )}
      {b.quotes.map((q) => {
        const r = computeQuote({
          currency: q.currency,
          travelers: q.travelers,
          lines: b.quoteLines.filter((l) => l.quoteId === q.id).map((l) => ({ id: l.id, category: l.category as QuoteCategory, description: l.description, quantity: l.quantity, unitAmount: l.unitAmount, currency: l.currency, fxRate: l.fxRate ?? undefined, perPerson: l.perPerson })),
          taxes: q.taxes,
          marginPercent: q.marginPercent ?? undefined,
          managementFee: q.managementFee ?? undefined,
        });
        return (
          <p key={q.id} className="mt-2 text-xs">
            Presupuesto ({q.status}): servicios {q.currency} {r.servicesTotal} · impuestos {r.taxesTotal} · margen {r.marginAmount} · gestión {r.managementFee} · <strong>precio final {q.currency} {r.finalPrice}</strong> ({r.perPerson} por persona) · TC: {q.fxNote ?? "—"} {q.fxDate ?? ""} · vigencia {q.validUntil ?? "—"}
          </p>
        );
      })}

      <H>E. Control de información</H>
      <ul className="list-disc pl-5">
        <li>Clima y estacionalidad: {VERIFICATION_LABELS.estimate} (biblioteca VIORA, valores aproximados).</li>
        <li>Duraciones de traslados: {it?.legs.map((l) => `${l.fromName}→${l.toName}: ${VERIFICATION_LABELS[l.duration.status]}${l.duration.checkedAt ? ` (${l.duration.checkedAt.slice(0, 10)})` : ""}`).join("; ") || "—"}</li>
        <li>Recomendaciones de destinos, actividades y zonas: {VERIFICATION_LABELS.ai_recommendation}.</li>
        <li>Requisitos migratorios: {VERIFICATION_LABELS.pending} — fuentes: {doc.entryRequirements.flatMap((e) => e.links.map((l) => l.url)).join(", ") || "—"}</li>
        <li>Disponibilidad y tarifas: {b.observations.some((o) => o.kind === "consulted_real") ? "consultas registradas (ver D)" : VERIFICATION_LABELS.unavailable}</li>
        {it?.days.flatMap((d) => d.activities.filter((a) => a.seasonal)).map((a) => (
          <li key={a.id}>
            {a.name}: {a.seasonal}
          </li>
        ))}
      </ul>
      <p className="mt-2">Información pendiente: {doc.pendingInfo.join("; ")}</p>

      <H>F. Próximos pasos</H>
      <ol className="list-decimal pl-5">
        {b.tasks.map((t) => (
          <li key={t.id}>
            {t.title} — <em>{t.status}</em>
            {t.dueDate ? ` (vence ${t.dueDate})` : ""}
          </li>
        ))}
      </ol>
      {b.notes.length > 0 && (
        <>
          <H>Notas internas</H>
          {b.notes.slice(0, 20).map((n) => (
            <p key={n.id} className="whitespace-pre-wrap border-b border-line/40 py-1 text-xs">
              [{n.kind} · {n.createdAt.toLocaleDateString("es-AR")}] {n.text}
            </p>
          ))}
        </>
      )}
      <p className="mt-6 text-xs text-muted">Época de referencia: {doc.profile.months.map((m) => MONTHS_ES[m - 1]).join(", ") || "sin definir"}.</p>
    </article>
  );
}
