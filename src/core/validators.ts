import { bestOrder, routeLengthKm } from "./geo";
import { isParkActivity } from "./itinerary";
import { severeSeasonRisk } from "./scoring";
import { addDays, nightsBetween } from "./profile";
import type { Destination, PlanDocument, TravelerProfile, ValidationIssue } from "./types";

type Itinerary = NonNullable<PlanDocument["itinerary"]>;

const PACE_HOURS = { relaxed: 5.5, balanced: 7.5, intense: 9.5 } as const;

/** Validaciones deterministas de coherencia. No dependen de la IA. */
export function validateItinerary(it: Itinerary, profile: TravelerProfile, library: Destination[], expectedNights: number | null): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const totalNights = it.stops.reduce((a, s) => a + s.nights, 0);

  if (expectedNights !== null && totalNights !== expectedNights) {
    issues.push({
      code: "nights_mismatch",
      severity: "error",
      message: `La suma de noches (${totalNights}) no coincide con la duración del viaje (${expectedNights}).`,
    });
  }
  if (it.days.length !== totalNights + 1) {
    issues.push({ code: "days_mismatch", severity: "error", message: `El itinerario tiene ${it.days.length} días para ${totalNights} noches (se esperaban ${totalNights + 1}).` });
  }
  it.days.forEach((d, i) => {
    if (d.n !== i + 1) issues.push({ code: "day_numbering", severity: "error", message: `Numeración de días inconsistente en el día ${d.n}.`, refs: [d.id] });
  });
  if (it.startDate) {
    it.days.forEach((d, i) => {
      if (d.date && d.date !== addDays(it.startDate!, i)) issues.push({ code: "date_gap", severity: "error", message: `La fecha del día ${d.n} no es consecutiva.`, refs: [d.id] });
    });
    it.stops.forEach((s, i) => {
      if (i > 0 && s.arrivalDate !== it.stops[i - 1].departureDate) {
        issues.push({ code: "stop_dates", severity: "error", message: `La llegada a ${s.name} no coincide con la salida de ${it.stops[i - 1].name}.`, refs: [s.id] });
      }
      if (s.arrivalDate && s.departureDate && nightsBetween(s.arrivalDate, s.departureDate) !== s.nights) {
        issues.push({ code: "stop_nights", severity: "error", message: `Las fechas de ${s.name} no coinciden con sus noches.`, refs: [s.id] });
      }
    });
  }
  it.stops.forEach((s) => {
    if (s.nights < 1) issues.push({ code: "zero_nights", severity: "error", message: `${s.name} tiene ${s.nights} noches.`, refs: [s.id] });
  });

  // Coherencia geográfica: ¿la ruta va y vuelve innecesariamente?
  const pts = it.stops.filter((s) => s.lat !== null && s.lng !== null).map((s) => ({ lat: s.lat!, lng: s.lng!, id: s.id }));
  if (pts.length >= 3) {
    const actual = routeLengthKm(pts);
    const optimal = routeLengthKm(bestOrder(pts));
    if (actual > optimal * 1.25 && actual - optimal > 300) {
      issues.push({
        code: "backtracking",
        severity: "warning",
        message: `El orden de la ruta recorre ~${Math.round(actual)} km; reordenando podría bajar a ~${Math.round(optimal)} km.`,
      });
    }
  }

  // Traslados largos o sin validar
  for (const l of it.legs) {
    const h = l.duration.value;
    const limit = profile.pace === "relaxed" ? 4.5 : 6.5;
    if (h !== null && h > limit) {
      issues.push({ code: "long_transfer", severity: "warning", message: `Traslado largo ${l.fromName} → ${l.toName} (~${h} h). Considerar vuelo o una parada intermedia.`, refs: [l.id] });
    }
    if (l.duration.status === "pending") {
      issues.push({ code: "unverified_connection", severity: "info", message: `Conexión ${l.fromName} → ${l.toName} pendiente de validación (estimada por distancia).`, refs: [l.id] });
    }
  }

  // Cambios de hotel
  const changes = it.stops.length - 1;
  if (profile.avoidHotelChanges && changes > 1) {
    issues.push({ code: "hotel_changes", severity: "warning", message: `La ruta implica ${changes} cambios de hotel y el cliente prefiere evitarlos.` });
  }
  const shortStays = it.stops.filter((s) => s.nights === 1);
  if (shortStays.length && profile.pace !== "intense") {
    issues.push({ code: "one_night", severity: "warning", message: `Estadías de una sola noche: ${shortStays.map((s) => s.name).join(", ")}.` });
  }

  // Sobrecarga y exigencia
  for (const d of it.days) {
    const hours = d.activities.reduce((a, x) => a + x.hours, 0);
    const singleFullDay = d.activities.length === 1 && hours >= 6; // parque o excursión de día completo
    if (!singleFullDay && hours > PACE_HOURS[profile.pace] + (profile.pace === "intense" ? 1.5 : 0.5)) {
      issues.push({ code: "overloaded_day", severity: "warning", message: `Día ${d.n}: ${hours} h de actividades para un ritmo ${profile.pace === "relaxed" ? "tranquilo" : profile.pace === "intense" ? "intenso" : "equilibrado"}.`, refs: [d.id] });
    }
    if (d.effort > profile.effortCap) {
      issues.push({ code: "effort", severity: "warning", message: `Día ${d.n}: exigencia física mayor a la indicada por el cliente.`, refs: [d.id] });
    }
  }

  // Parques temáticos: días de parque seguidos sin descanso
  let streak = 0;
  for (const d of it.days) {
    streak = d.activities.some(isParkActivity) ? streak + 1 : 0;
    if (streak === 3) {
      issues.push({ code: "park_streak", severity: "warning", message: `Hay 3 o más días de parque seguidos (hasta el día ${d.n}). Conviene intercalar un día de descanso.`, refs: [d.id] });
    }
  }

  // Temporada
  const month = it.startDate ? parseInt(it.startDate.slice(5, 7), 10) : profile.months[0];
  if (month) {
    for (const s of it.stops) {
      const dest = library.find((x) => x.id === s.destinationId);
      for (const r of dest?.risks ?? []) {
        if (r.months.includes(month) && ["closures", "hurricane", "monsoon", "sargassum"].includes(r.kind) && r.level !== "low") {
          issues.push({ code: `season_${r.kind}`, severity: "warning", message: `${s.name}: ${r.note}` });
        }
      }
    }
    for (const s of it.stops) {
      const dest = library.find((x) => x.id === s.destinationId);
      const severe = dest ? severeSeasonRisk(dest, month, profile) : null;
      if (severe) issues.push({ code: "season_not_advised", severity: "warning", message: `${s.name} no es recomendable en esta época para este perfil: ${severe}`, refs: [s.id] });
    }
    for (const d of it.days) {
      for (const a of d.activities) {
        const libAct = library.flatMap((x) => x.highlights).find((h) => h.name === a.name);
        if (libAct?.months && !libAct.months.includes(month)) {
          issues.push({ code: "out_of_season_activity", severity: "error", message: `Día ${d.n}: «${a.name}» no suele estar disponible en la época del viaje.`, refs: [a.id] });
        }
      }
    }
  }
  return issues;
}
