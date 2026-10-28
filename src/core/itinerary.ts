import { LODGING_LABELS, MONTHS_ES } from "./catalog";
import { estimateLeg } from "./geo";
import { addDays } from "./profile";
import type {
  Destination,
  KnownConnection,
  LibraryActivity,
  LodgingSuggestion,
  PlanActivity,
  PlanDay,
  PlanDocument,
  PlanLeg,
  PlanStop,
  TravelerProfile,
} from "./types";

type Itinerary = NonNullable<PlanDocument["itinerary"]>;

const HOURS_BY_PACE = { relaxed: 4.5, balanced: 6.5, intense: 8.5 } as const;

let counter = 0;
export function newId(prefix: string): string {
  counter = (counter + 1) % 1_000_000;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function activityScore(a: LibraryActivity, profile: TravelerProfile, month: number | null): number {
  if (a.effort > profile.effortCap) return -Infinity;
  if (month && a.months && !a.months.includes(month)) return -Infinity;
  if (profile.kids.some((k) => k < 6) && a.kidsOk === false) return -Infinity;
  let s = a.tags.reduce((acc, t) => acc + (profile.interests[t] ?? 0), 0);
  if (a.tags.includes("iconic") && profile.firstTimeEurope) s += 0.5;
  if (profile.kids.length && a.kidsOk) s += 0.6;
  if (profile.pace === "relaxed" && a.effort === 3) s -= 0.8;
  return s;
}

export function whyActivity(a: LibraryActivity, profile: TravelerProfile): string {
  const reasons: string[] = [];
  const top = a.tags.filter((t) => (profile.interests[t] ?? 0) >= 0.5);
  const labels: Record<string, string> = {
    beach: "buscás playa",
    relax: "querés descansar",
    culture: "te interesa la cultura",
    history: "te interesa la historia",
    architecture: "te atrae la arquitectura",
    gastronomy: "querés comer bien",
    nature: "priorizás paisajes y naturaleza",
    adventure: "te gusta la aventura",
    nightlife: "querés salir de noche",
    shopping: "querés hacer compras",
    romance: "es un viaje romántico",
    family: "viajás en familia",
    themeparks: "querés parques temáticos",
    iconic: "querés ver los lugares imperdibles",
    offbeat: "buscás experiencias auténticas",
    luxury: "buscás experiencias especiales",
    wellness: "valorás el bienestar",
    wine: "te interesan los vinos",
  };
  top.slice(0, 2).forEach((t) => reasons.push(labels[t]));
  if (profile.kids.length && a.kidsOk) reasons.push("es apta para chicos");
  return reasons.length ? `Porque ${reasons.join(" y ")}.` : "Un clásico del destino que vale la pena considerar.";
}

function toPlanActivity(a: LibraryActivity, dest: Destination, profile: TravelerProfile, origin: PlanActivity["origin"] = "engine"): PlanActivity {
  return {
    id: newId("act"),
    origin,
    name: a.name,
    why: whyActivity(a, profile),
    hours: a.hours,
    where: dest.name,
    booking: a.booking,
    seasonal: a.months ? `Disponible principalmente en: ${a.months.map((m) => MONTHS_ES[m - 1]).join(", ")}` : undefined,
    effort: a.effort,
    indoor: a.indoor,
    url: a.url,
    alternatives: a.note,
    themePark: isParkActivity(a) || undefined,
  };
}

export function lodgingCategory(profile: TravelerProfile, dest: Destination): string {
  const prefs = profile.allInclusive === "yes" && (dest.kind === "resort" || dest.kind === "beach") ? "all_inclusive" : null;
  if (prefs) return LODGING_LABELS.all_inclusive;
  switch (profile.budgetTier) {
    case "backpacker":
      return "Hostel o alojamiento económico";
    case "economic":
      return "Hotel económico bien ubicado (2★–3★)";
    case "moderate":
      return "Hotel de categoría media (3★–4★)";
    case "comfort":
      return "Hotel superior o boutique (4★)";
    case "premium":
      return "Hotel superior o boutique destacado (4★–5★)";
    default:
      return "Alojamiento de lujo (5★ o boutique exclusivo)";
  }
}

function pickZone(dest: Destination, profile: TravelerProfile) {
  const zones = dest.lodgingZones;
  if (!zones.length) return { name: "Zona céntrica", profile: "A definir" };
  if (profile.kids.length) {
    const fam = zones.find((z) => /famil|calmo|tranquil/i.test(z.profile));
    if (fam) return fam;
  }
  if (profile.pace === "relaxed" || (profile.interests.relax ?? 0) > 0.7) {
    const q = zones.find((z) => /tranquil|calma|exclusiv|aislado/i.test(z.profile));
    if (q && !profile.priorities.includes("central_lodging")) return q;
  }
  return zones[0];
}

export function googleFlightsLink(from: string, to: string, depart?: string, ret?: string): string {
  let q = `Flights from ${from} to ${to}`;
  if (depart) q += ` on ${depart}`;
  if (ret) q += ` through ${ret}`;
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(q)}&hl=es-419`;
}

/**
 * Construye el itinerario día por día para una secuencia de paradas.
 * `previous` permite conservar elementos bloqueados (editados por el agente).
 */
export function buildItinerary(
  alternativeId: string,
  stopsIn: { dest: Destination; nights: number; locked?: boolean; stopId?: string; lodgingZone?: string }[],
  profile: TravelerProfile,
  connections: KnownConnection[],
  opts: { startDate?: string; previous?: Itinerary | null } = {},
): Itinerary {
  const prev = opts.previous ?? null;
  const startDate = opts.startDate;
  const month = startDate ? parseInt(startDate.slice(5, 7), 10) : profile.months[0] ?? null;

  // Paradas
  let cursor = 0;
  const stops: PlanStop[] = stopsIn.map((s) => {
    const prevStop = prev?.stops.find((p) => p.id === s.stopId || (p.destinationId === s.dest.id && !s.stopId));
    const stop: PlanStop = {
      id: prevStop?.id ?? s.stopId ?? newId("stop"),
      origin: prevStop?.origin ?? "engine",
      locked: s.locked ?? prevStop?.locked,
      destinationId: s.dest.id,
      name: s.dest.name,
      country: s.dest.country,
      lat: s.dest.lat,
      lng: s.dest.lng,
      nights: s.nights,
      lodgingZone: s.lodgingZone ?? prevStop?.lodgingZone ?? pickZone(s.dest, profile).name,
      arrivalDate: startDate ? addDays(startDate, cursor) : undefined,
      departureDate: startDate ? addDays(startDate, cursor + s.nights) : undefined,
    };
    cursor += s.nights;
    return stop;
  });

  // Traslados
  const legs: PlanLeg[] = [];
  for (let i = 1; i < stopsIn.length; i++) {
    const est = estimateLeg(stopsIn[i - 1].dest, stopsIn[i].dest, connections, {
      preferFlights: profile.preferFlightsOverLongTrains,
      noCar: profile.noCar,
    });
    const prevLeg = prev?.legs.find((l) => l.fromStopId === stops[i - 1].id && l.toStopId === stops[i].id && l.locked);
    legs.push(
      prevLeg ?? {
        id: newId("leg"),
        origin: "engine",
        fromStopId: stops[i - 1].id,
        toStopId: stops[i].id,
        fromName: stops[i - 1].name,
        toName: stops[i].name,
        mode: est.mode,
        duration: est.duration,
        operators: est.operators,
        distanceKm: est.distanceKm,
        date: stops[i].arrivalDate,
        notes: est.note,
      },
    );
  }

  // Días
  const totalNights = stopsIn.reduce((a, s) => a + s.nights, 0);
  const days: PlanDay[] = [];
  const budget = HOURS_BY_PACE[profile.pace] + (profile.kids.some((k) => k < 6) ? -1.5 : 0);
  // Parques temáticos: nunca más de 2 días seguidos (1 con chicos menores de 6 o ritmo tranquilo).
  const maxParkStreak = profile.kids.some((k) => k < 6) || profile.pace === "relaxed" ? 1 : 2;
  let parkStreak = 0;
  let dayN = 1;
  stopsIn.forEach((s, si) => {
    const stop = stops[si];
    const dest = s.dest;
    const lockedPrevDays = prev?.days.filter((d) => d.stopId === stop.id && d.locked) ?? [];
    const lockedActivityNames = new Set(
      (prev?.days ?? []).filter((d) => d.stopId === stop.id).flatMap((d) => d.activities.filter((a) => a.locked).map((a) => a.name)),
    );
    const pool = dest.highlights
      .filter((a) => !lockedActivityNames.has(a.name))
      .map((a) => ({ a, s: activityScore(a, profile, month) }))
      .filter((x) => x.s > -Infinity)
      .sort((x, y) => y.s - x.s)
      .map((x) => x.a);
    const lockedActs = (prev?.days ?? []).filter((d) => d.stopId === stop.id).flatMap((d) => d.activities.filter((a) => a.locked));
    const daysHere = s.nights; // la noche de llegada + días completos; el día de partida pertenece a la parada siguiente
    const restEvery = dest.kind === "beach" || dest.kind === "resort" || dest.kind === "island" ? 2 : profile.pace === "relaxed" ? 3 : 0;
    const hasParks = pool.some(isParkActivity);
    const altitude = (dest.risks ?? []).some((r) => r.kind === "altitude");
    let fullIndex = 0;
    for (let k = 0; k < daysHere; k++) {
      const date = startDate ? addDays(startDate, dayN - 1) : undefined;
      const lockedDay = lockedPrevDays.find((d) => d.n === dayN || d.title === `${dest.name}`);
      if (lockedDay) {
        days.push({ ...lockedDay, n: dayN, date, stopId: stop.id });
        dayN++;
        continue;
      }
      const isArrival = k === 0;
      const kind: PlanDay["kind"] = isArrival ? (si === 0 ? "arrival" : "transfer") : "full";
      const activities: PlanActivity[] = [];
      let hours = isArrival ? (si === 0 ? 1.5 : 2.5) : budget;
      const parkBreak = !isArrival && hasParks && parkStreak >= maxParkStreak;
      const isRest = parkBreak || (!isArrival && restEvery > 0 && fullIndex % restEvery === restEvery - 1);
      // Altura: llegada y primer día completo suaves para aclimatarse.
      const acclimatizing = altitude && k <= 1;
      if (acclimatizing && !isArrival) hours = Math.min(hours, Math.max(2.5, budget - 2.5));
      if (!isArrival) fullIndex++;
      if (!isRest) {
        // Primero se reubican actividades bloqueadas por el agente.
        while (lockedActs.length && hours > 0) {
          const la = lockedActs.shift()!;
          activities.push(la);
          hours -= la.hours;
        }
        for (let idx = 0; idx < pool.length && hours > 0.5; idx++) {
          const a = pool[idx];
          const isDayTrip = a.kind === "daytrip" || a.hours >= 6;
          if (isArrival && (isDayTrip || a.effort === 3)) continue;
          if (isArrival && si === 0 && (a.hours > 2 || a.effort > 1)) continue; // llegada de un vuelo largo: día liviano
          if (isDayTrip && activities.length) continue;
          // Un día completo (parque o excursión larga) ocupa la jornada entera aunque supere el ritmo habitual.
          if (a.hours > hours + 1.5 && !(isDayTrip && !activities.length && !isArrival)) continue;
          if (isDayTrip && s.nights < 3 && profile.pace !== "intense") continue;
          if (acclimatizing && a.effort === 3) continue;
          if (isParkActivity(a) && (parkStreak >= maxParkStreak || activities.some(isParkActivity))) continue;
          activities.push(toPlanActivity(a, dest, profile));
          pool.splice(idx, 1);
          idx--;
          hours -= a.hours;
          if (isDayTrip) break;
        }
      }
      parkStreak = activities.some(isParkActivity) ? parkStreak + 1 : 0;
      const outdoor = activities.some((a) => !a.indoor);
      const indoorAlt = month && dest.climate.rain[month - 1] >= 1 && outdoor ? pool.find((a) => a.indoor) : undefined;
      const leg = legs.find((l) => l.toStopId === stop.id);
      const effort = activities.reduce<number>((m, a) => Math.max(m, a.effort), 1) as 1 | 2 | 3;
      const food = dest.food.length ? dest.food[(dayN + si) % dest.food.length] : undefined;
      let title: string;
      if (kind === "arrival") title = `Llegada a ${dest.name}`;
      else if (kind === "transfer") title = `${stops[si - 1].name} → ${dest.name}`;
      else if (parkBreak) title = "Descanso entre parques";
      else if (isRest || !activities.length) title = dest.kind === "beach" || dest.kind === "resort" || dest.kind === "island" ? `Playa y descanso en ${dest.name}` : `Día libre en ${dest.name}`;
      else title = activities.map((a) => a.name).slice(0, 2).join(" · ");
      days.push({
        id: newId("day"),
        origin: "engine",
        n: dayN,
        date,
        stopId: stop.id,
        title,
        kind: isRest || (!activities.length && kind === "full") ? "rest" : kind,
        activities,
        food: food ? `Para probar: ${food}.` : undefined,
        freeTime:
          kind === "arrival"
            ? "Check-in, descanso del vuelo y primer paseo tranquilo por la zona del alojamiento."
            : kind === "transfer"
              ? "Tarde libre para instalarse y recorrer el barrio."
              : parkBreak
                ? "Día sin parques para recargar energía: pileta del hotel, siesta y, si tienen ganas, un paseo liviano o compras. Alternar descanso hace que los días de parque se disfruten mucho más."
                : acclimatizing && !activities.length
                  ? "Día tranquilo para aclimatarse a la altura: caminar despacio, hidratarse y evitar esfuerzos."
                  : isRest || !activities.length
                ? "Día sin actividades programadas para descansar o recorrer a tu ritmo."
                : hours > 1.5
                  ? "Tiempo libre por la tarde/noche."
                  : "Jornada completa: conviene una cena cerca del alojamiento.",
        rainPlan: indoorAlt ? `Si llueve: ${indoorAlt.name}.` : undefined,
        effort,
        logistics:
          kind === "transfer" && leg
            ? `Traslado ${leg.fromName} → ${leg.toName} en ${modeLabel(leg.mode)} (${leg.duration.value ? `~${leg.duration.value} h, ` : ""}${leg.duration.status === "pending" ? "pendiente de validación" : "estimación"}).`
            : kind === "arrival"
              ? `Llegada desde ${profile.originLabel}. Traslado aeropuerto–hotel a coordinar.`
              : undefined,
      });
      dayN++;
    }
  });
  // Día de regreso
  const last = stops[stops.length - 1];
  days.push({
    id: newId("day"),
    origin: "engine",
    n: dayN,
    date: startDate ? addDays(startDate, totalNights) : undefined,
    stopId: last.id,
    title: `Regreso desde ${last.name}`,
    kind: "departure",
    activities: [],
    freeTime: "Según el horario del vuelo, última caminata o compras de último momento.",
    effort: 1,
    logistics: `Traslado al aeropuerto (${stopsIn[stopsIn.length - 1].dest.airports.join(" / ")}) y vuelo de regreso.`,
  });

  // Alojamiento (sin inventar establecimientos: solo categoría y zona)
  const lodging: LodgingSuggestion[] = stopsIn.map((s, i) => {
    const prevL = prev?.lodging.find((l) => l.stopId === stops[i].id);
    if (prevL?.locked) return prevL;
    const zone = s.dest.lodgingZones.find((z) => z.name === stops[i].lodgingZone) ?? pickZone(s.dest, profile);
    return {
      id: prevL?.id ?? newId("lod"),
      origin: "engine",
      stopId: stops[i].id,
      category: lodgingCategory(profile, s.dest),
      zone: zone.name,
      zoneProfile: zone.profile,
      why: `Zona recomendada por ${zone.profile.toLowerCase()}; categoría según tu nivel de presupuesto${profile.travelers > 2 ? ` y ${profile.travelers} viajeros` : ""}.`,
      options: prevL?.options ?? [],
    };
  });

  const destAirports = stopsIn[0].dest.airports;
  const returnAirports = stopsIn[stopsIn.length - 1].dest.airports;
  const endDate = startDate ? addDays(startDate, totalNights) : undefined;
  const origin = profile.originAirports[0] ?? profile.originLabel;
  const searchLinks: { label: string; url: string }[] = [];
  if (destAirports[0]) {
    if (returnAirports[0] && returnAirports[0] !== destAirports[0]) {
      searchLinks.push({ label: `Ida ${origin} → ${destAirports[0]}`, url: googleFlightsLink(origin, destAirports[0], startDate) });
      searchLinks.push({ label: `Regreso ${returnAirports[0]} → ${origin}`, url: googleFlightsLink(returnAirports[0], origin, endDate) });
    } else {
      searchLinks.push({ label: `${origin} ⇄ ${destAirports[0]}`, url: googleFlightsLink(origin, destAirports[0], startDate, endDate) });
    }
  }
  const flightNotes = [
    "Los enlaces abren una búsqueda en un sitio externo: no son una cotización ni confirman disponibilidad.",
  ];
  if (returnAirports[0] !== destAirports[0]) flightNotes.push("Ruta de ida y regreso por ciudades distintas (multidestino / open jaw): evita volver al punto de partida.");

  return {
    alternativeId,
    startDate,
    stops,
    legs,
    days,
    lodging,
    flights: {
      originAirports: profile.originAirports,
      destinationAirports: destAirports,
      returnAirports,
      notes: flightNotes,
      searchLinks,
    },
  };
}

/** Actividad de parque temático (día completo de parque). */
export function isParkActivity(a: { tags?: string[]; kind?: string; themePark?: boolean }): boolean {
  return !!a.themePark || (a.kind === "park" && !!a.tags?.includes("themeparks"));
}

export function modeLabel(m: string): string {
  return (
    {
      plane: "avión",
      train: "tren",
      bus: "bus",
      car: "auto",
      private_transfer: "traslado privado",
      public_transport: "transporte público",
      ferry: "ferry",
    } as Record<string, string>
  )[m] ?? m;
}
