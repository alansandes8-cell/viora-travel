import { describe, expect, it } from "vitest";
import { estimateActivities, estimateFlight, estimateHotel } from "@/core/fares";
import { SEED_DESTINATIONS } from "@/core/library";
import { DEFAULT_TRIP_ESTIMATE, currentTripTable } from "@/core/trip-estimate";

const EZE = { lat: -34.82, lng: -58.54, countryCode: "AR" };
const MAD = { lat: 40.47, lng: -3.56, countryCode: "ES" };
const MIA = { lat: 25.79, lng: -80.29, countryCode: "US" };
const BRC = { lat: -41.15, lng: -71.16, countryCode: "AR" };
const base = { adults: 1, children: 0, infants: 0, cabin: "economy" as const };

describe("tarifas estimadas (con margen hacia arriba)", () => {
  it("Buenos Aires–Madrid en temporada media queda en un rango realista y no bajo", () => {
    const e = estimateFlight({ ...base, from: EZE, to: MAD, depart: "2027-05-10", ret: "2027-05-24" }, "2027-02-01");
    expect(e.perAdult[0]).toBeGreaterThanOrEqual(1150);
    expect(e.perAdult[1]).toBeGreaterThanOrEqual(1850);
    expect(e.likelyStops).toBe(true);
  });
  it("Miami es más barato que Madrid y Bariloche más barato que Miami", () => {
    const opts = { depart: "2027-05-10", ret: "2027-05-24" };
    const mia = estimateFlight({ ...base, ...opts, from: EZE, to: MIA }, "2027-02-01");
    const brc = estimateFlight({ ...base, ...opts, from: EZE, to: BRC }, "2027-02-01");
    const mad = estimateFlight({ ...base, ...opts, from: EZE, to: MAD }, "2027-02-01");
    expect(brc.perAdult[1]).toBeLessThan(mia.perAdult[0]);
    expect(mia.perAdult[1]).toBeLessThan(mad.perAdult[1]);
  });
  it("temporada alta, poca anticipación y ejecutiva encarecen; niños y bebés suman menos que un adulto", () => {
    const q = { ...base, from: EZE, to: MAD, depart: "2027-05-10", ret: "2027-05-24" };
    const normal = estimateFlight(q, "2027-02-01");
    expect(estimateFlight({ ...q, depart: "2027-07-10", ret: "2027-07-24" }, "2027-04-01").perAdult[0]).toBeGreaterThan(normal.perAdult[0]);
    expect(estimateFlight(q, "2027-05-01").perAdult[0]).toBeGreaterThan(normal.perAdult[0]);
    expect(estimateFlight({ ...q, cabin: "business" }, "2027-02-01").perAdult[0]).toBeGreaterThan(normal.perAdult[0] * 3);
    const fam = estimateFlight({ ...q, adults: 2, children: 1, infants: 1 }, "2027-02-01");
    expect(fam.total[0]).toBeGreaterThan(normal.perAdult[0] * 2.5);
    expect(fam.total[0]).toBeLessThan(normal.perAdult[0] * 4);
  });
  it("hoteles: más estrellas, más caro; 3 personas usan 2 habitaciones", () => {
    const h3 = estimateHotel(4, "2027-05-10", "2027-05-17", 3, 3);
    const h5 = estimateHotel(4, "2027-05-10", "2027-05-17", 3, 5);
    expect(h3.nights).toBe(7);
    expect(h3.rooms).toBe(2);
    expect(h5.perNight[0]).toBeGreaterThan(h3.perNight[1]);
  });
  it("actividades: cada destino tiene precios o «libre», nunca negativos", () => {
    for (const d of SEED_DESTINATIONS.slice(0, 30))
      for (const a of estimateActivities(d)) if (a.perAdult) expect(a.perAdult[0]).toBeGreaterThan(0);
  });
  it("la tabla de costo total guardada con la versión vieja se reemplaza por la nueva", () => {
    expect(currentTripTable({ ...DEFAULT_TRIP_ESTIMATE, version: undefined, flights: { europa: [1100, 1800] } })).toBe(DEFAULT_TRIP_ESTIMATE);
    expect(DEFAULT_TRIP_ESTIMATE.flights.europa[0]).toBeGreaterThanOrEqual(1300);
  });
});
