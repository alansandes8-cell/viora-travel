import { describe, expect, it } from "vitest";
import { bestMonths, guideCost, guideFaq, monthTable } from "@/core/destination-guide";
import { SEED_DESTINATIONS } from "@/core/library";

const byId = (id: string) => SEED_DESTINATIONS.find((d) => d.id === id)!;

describe("guías de destino", () => {
  it("Caribe: evita la temporada de huracanes entre los mejores meses", () => {
    const best = bestMonths(monthTable(byId("punta-cana"))).map((r) => r.month);
    expect(best.some((m) => [8, 9, 10].includes(m))).toBe(false);
  });
  it("Europa: no recomienda pleno invierno", () => {
    const best = bestMonths(monthTable(byId("praga"))).map((r) => r.month);
    expect(best.some((m) => [12, 1, 2].includes(m))).toBe(false);
  });
  it("todas las guías generan costos y preguntas sin datos vacíos", () => {
    for (const d of SEED_DESTINATIONS) {
      const rows = monthTable(d);
      const faq = guideFaq(d, guideCost(d, { lat: d.lat, lng: d.lng, countryCode: d.countryCode }, new Date("2026-11-07")), rows);
      expect(faq.length).toBeGreaterThanOrEqual(3);
      for (const f of faq) expect(f.a).not.toMatch(/undefined|NaN|null/);
    }
  });
});
