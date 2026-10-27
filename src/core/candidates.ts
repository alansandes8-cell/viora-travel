import { bestOrder, haversineKm } from "./geo";
import { SUPER_REGION } from "./library";
import { allocateNights } from "./nights";
import { affinityOf, type CandidateStop } from "./scoring";
import type { Destination, TravelerProfile } from "./types";

export interface Candidate {
  key: string;
  kind: "single" | "route";
  stops: CandidateStop[];
  notes: string[];
}

const DEFAULT_NIGHTS: Record<TravelerProfile["shape"], number> = { single: 9, multi: 14, open: 10 };

export function tripNights(profile: TravelerProfile): number {
  return profile.nights ?? DEFAULT_NIGHTS[profile.shape];
}

function allowedByWish(dests: Destination[], profile: TravelerProfile): boolean {
  if (!profile.wishIds.length && !profile.wishRegions.length) return true;
  if (dests.some((d) => profile.wishIds.includes(d.id))) return true;
  if (profile.wishRegions.length && dests.every((d) => profile.wishRegions.includes(SUPER_REGION[d.cluster]))) return true;
  return false;
}

/** ¿El cliente ya conoce este destino (por ciudad, o por país en sus destinos más clásicos)? */
export function isKnown(d: Destination, profile: TravelerProfile): boolean {
  if (profile.wishIds.includes(d.id)) return false;
  if (profile.visitedIds.includes(d.id)) return true;
  return (profile.visitedCountries ?? []).includes(d.countryCode) && !!d.firstTimerFriendly;
}

/**
 * Genera candidatos. Los lugares que el cliente ya conoce se excluyen, salvo que haya pedido
 * incluirlos o que sin ellos no alcancen las opciones (en ese caso se marca `knownIncluded`).
 */
export function generateCandidates(profile: TravelerProfile, library: Destination[]): Candidate[] & { knownIncluded?: boolean } {
  const allowed = library.filter((d) => !profile.excludedIds.includes(d.id));
  const fresh = allowed.filter((d) => profile.includeKnown || !isKnown(d, profile));
  const strict = buildCandidates(profile, fresh);
  if (profile.includeKnown || primaries(strict) >= 3) return strict;

  // Antes de repetir lugares conocidos: estadías más largas en lugares nuevos y,
  // como mucho, un lugar conocido como escala breve (nunca como destino principal).
  const merged = new Map(strict.map((c) => [c.key, c]));
  for (const c of buildCandidates(profile, fresh, 1.8)) if (!merged.has(c.key)) merged.set(c.key, c);
  if (primaries([...merged.values()]) >= 3) return [...merged.values()];
  for (const c of buildCandidates(profile, allowed)) if (!merged.has(c.key) && !isKnown(primaryOf(c), profile)) merged.set(c.key, c);
  const widened = [...merged.values()];
  if (primaries(widened) >= 3) return widened;

  const relaxed = buildCandidates(profile, allowed) as Candidate[] & { knownIncluded?: boolean };
  relaxed.knownIncluded = true;
  return relaxed;
}

function primaryOf(c: Candidate): Destination {
  return c.stops.reduce((a, b) => (b.nights > a.nights ? b : a)).dest;
}

function primaries(cs: Candidate[]): number {
  return new Set(cs.map((c) => primaryOf(c).id)).size;
}

function buildCandidates(profile: TravelerProfile, pool: Destination[], stretch = 1): Candidate[] {
  const nights = tripNights(profile);
  const aff = new Map(pool.map((d) => [d.id, affinityOf(d, profile)]));
  const out: Candidate[] = [];
  const seen = new Set<string>();
  const push = (c: Candidate) => {
    const key = c.stops.map((s) => s.dest.id).sort().join("+");
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ ...c, key });
  };
  const paceFactor = (profile.pace === "relaxed" ? 1.3 : profile.pace === "intense" ? 0.9 : 1.1) * stretch;

  const wantsSingle = profile.shape !== "multi" || nights <= 6;
  const wantsRoute =
    stretch > 1 ||
    profile.shape === "multi" ||
    (profile.shape === "open" && nights >= 8 && !profile.avoidHotelChanges) ||
    (profile.shape === "single" && nights >= 16 && !profile.avoidHotelChanges);

  // 1) Destino único
  if (wantsSingle) {
    for (const d of pool) {
      if (nights > d.nights.max * paceFactor + 2) continue;
      if (nights < Math.max(1, d.nights.min - 1)) continue;
      if (!allowedByWish([d], profile)) continue;
      push({ key: "", kind: "single", stops: [{ dest: d, nights }], notes: [] });
    }
    // 2) Base + complemento cercano (p. ej., ciudad + playa) cuando el viaje es largo
    for (const d of pool) {
      if (nights <= d.nights.ideal + 1) continue;
      if (profile.avoidHotelChanges && nights <= d.nights.max * paceFactor + 2) continue;
      const partners = pool
        .filter((p) => {
          if (p.id === d.id || SUPER_REGION[p.cluster] !== SUPER_REGION[d.cluster]) return false;
          const km = haversineKm(d, p);
          // Para viajes de descanso solo combinaciones cercanas (mismo país o < 500 km); si no, hasta 1600 km.
          const restful = (profile.interests.relax ?? 0) >= 0.7;
          return restful ? p.countryCode === d.countryCode && km < 900 : km < 1600;
        })
        .sort((a, b) => (aff.get(b.id) ?? 0) - (aff.get(a.id) ?? 0))
        .slice(0, 3);
      for (const p of partners) {
        if (!allowedByWish([d, p], profile)) continue;
        if (d.nights.max + p.nights.max < nights * 0.75) continue;
        const ordered = bestOrder([d, p], profile.originCoords ?? undefined);
        const alloc = allocateNights(ordered.map((x) => ({ dest: x, weight: aff.get(x.id) ?? 5 })), nights, profile.pace);
        if (alloc.kept.length < 2) continue;
        push({ key: "", kind: "route", stops: ordered.map((x, i) => ({ dest: x, nights: alloc.nights[i] })), notes: alloc.notes });
      }
    }
  }

  // 3) Rutas multidestino por superregión
  if (wantsRoute && nights >= 5) {
    const perStop = profile.avoidHotelChanges ? 5.5 : profile.pace === "relaxed" ? 4.5 : profile.pace === "intense" ? 2.6 : 3.4;
    const k = Math.max(2, Math.min(7, Math.round(nights / perStop)));
    const regions = new Set(pool.map((d) => SUPER_REGION[d.cluster]));
    for (const region of regions) {
      const regional = pool.filter((d) => SUPER_REGION[d.cluster] === region);
      if (regional.length < 2) continue;
      const clusters = [...new Set(regional.map((d) => d.cluster))];
      // Una semilla por cluster → rutas distintas dentro de la misma región (p. ej., Italia, Iberia, Europa central)
      for (const [seedCluster, focus] of clusters.flatMap((c) => [[c, false], [c, true]] as [string, boolean][])) {
        if (focus && regional.filter((d) => d.cluster === seedCluster).length < 3) continue;
        const seeds = regional.filter((d) => d.cluster === seedCluster).sort((a, b) => (aff.get(b.id) ?? 0) - (aff.get(a.id) ?? 0));
        const seed = seeds[0];
        if (!seed) continue;
        const chosen: Destination[] = [seed];
        while (chosen.length < k) {
          let best: Destination | null = null;
          let bestVal = -Infinity;
          for (const c of regional) {
            if (chosen.includes(c)) continue;
            const minKm = Math.min(...chosen.map((x) => haversineKm(x, c)));
            if (minKm > 1300) continue;
            const sameCluster = c.cluster === seedCluster ? (focus ? 4 : 0.8) : 0;
            const val = (aff.get(c.id) ?? 0) + sameCluster - minKm / 350;
            if (val > bestVal) {
              bestVal = val;
              best = c;
            }
          }
          if (!best) break;
          chosen.push(best);
        }
        if (chosen.length < 2) continue;
        if (!allowedByWish(chosen, profile)) continue;
        const ordered = bestOrder(chosen, profile.originCoords ?? undefined);
        const alloc = allocateNights(ordered.map((d) => ({ dest: d, weight: aff.get(d.id) ?? 5 })), nights, profile.pace);
        const kept = ordered.filter((d) => alloc.kept.includes(d.id));
        if (kept.length < 2) continue;
        push({ key: "", kind: "route", stops: kept.map((d, i) => ({ dest: d, nights: alloc.nights[i] })), notes: alloc.notes });
      }
    }
  }
  return out;
}
