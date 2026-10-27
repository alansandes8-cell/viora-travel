import { describe, expect, it } from "vitest";
import { applyChanges, parseChangeRequest } from "@/core/changes";
import { haversineKm } from "@/core/geo";
import { SUPER_REGION } from "@/core/library";
import { generatePlan } from "@/core/plan";
import { computeQuote } from "@/core/pricing";
import { pickSmartQuestions } from "@/core/questions";
import { scanForMoney, toClientProposal } from "@/core/sanitize";
import { buildProfile } from "@/core/profile";
import type { PlanDocument } from "@/core/types";
import { answers, ctx } from "./fixtures";

const lib = ctx.library;
const regionOf = (id: string) => SUPER_REGION[lib.find((d) => d.id === id)!.cluster];

/** Invariantes que todo plan debe cumplir. */
function assertInvariants(doc: PlanDocument, expectedNights: number) {
  const it = doc.itinerary!;
  expect(it).toBeTruthy();
  const sum = it.stops.reduce((a, s) => a + s.nights, 0);
  expect(sum).toBe(expectedNights);
  expect(it.days.length).toBe(expectedNights + 1);
  it.days.forEach((d, i) => expect(d.n).toBe(i + 1));
  expect(doc.checks.filter((c) => c.severity === "error")).toEqual([]);
  // Coherencia geográfica: ningún salto entre paradas consecutivas supera los 2500 km dentro de una ruta.
  for (let i = 1; i < it.stops.length; i++) {
    const a = it.stops[i - 1];
    const b = it.stops[i];
    expect(haversineKm({ lat: a.lat!, lng: a.lng! }, { lat: b.lat!, lng: b.lng! })).toBeLessThan(2500);
  }
  // Todas las duraciones de traslado están rotuladas (estimación o pendiente), nunca "verificadas" por el motor.
  it.legs.forEach((l) => expect(["estimate", "pending"]).toContain(l.duration.status));
  // Exactamente 3 alternativas con etiquetas
  expect(doc.alternatives.length).toBe(3);
  doc.alternatives.forEach((a) => expect(a.labels.length).toBeGreaterThan(0));
}

describe("Escenario 1 — playa 14 noches en febrero desde Buenos Aires", () => {
  const a = answers({
    tripStyles: ["beach_relax"],
    dreamText: "Quiero pasar 14 días descansando en una playa paradisíaca, con arena blanca, agua turquesa y buena gastronomía",
    dates: { mode: "month", months: [2], nights: 14 },
    priorities: { selected: ["rest", "few_hotel_changes", "eat_well", "quiet_beaches"], ranking: ["rest"], mustHave: ["few_hotel_changes"] },
  });
  const doc = generatePlan(a, ctx);
  it("cumple invariantes", () => assertInvariants(doc, 14));
  it("propone destinos de playa y un solo alojamiento", () => {
    doc.alternatives.forEach((alt) => {
      expect(alt.stops.length).toBe(1);
      const d = lib.find((x) => x.id === alt.stops[0].destinationId)!;
      expect(d.tags.beach ?? 0).toBeGreaterThanOrEqual(2);
    });
  });
  it("las tres alternativas son distintas y tienen etiquetas distintas", () => {
    const ids = new Set(doc.alternatives.map((x) => x.stops[0].destinationId));
    expect(ids.size).toBe(3);
    const labels = new Set(doc.alternatives.map((x) => x.labels[0]));
    expect(labels.size).toBe(3);
  });
  it("el clima se presenta como estimación", () => {
    doc.alternatives.forEach((alt) => expect(alt.climateNote.status).toBe("estimate"));
  });
});

describe("Escenario 2 — Eurotrip de 21 días, primera vez en Europa", () => {
  const a = answers({
    tripStyles: ["eurotrip", "culture_history"],
    dates: { mode: "exact", departure: "2027-05-03", return: "2027-05-24" },
    priorities: { selected: ["historic_sites", "eat_well", "famous_sights"], ranking: [], mustHave: [] },
  });
  const doc = generatePlan(a, ctx);
  it("cumple invariantes", () => assertInvariants(doc, 21));
  it("todas las alternativas son rutas europeas multidestino", () => {
    doc.alternatives.forEach((alt) => {
      expect(alt.stops.length).toBeGreaterThanOrEqual(3);
      alt.stops.forEach((s) => expect(regionOf(s.destinationId)).toBe("europa"));
    });
  });
  it("no asigna automáticamente 2 noches a cada ciudad", () => {
    const n = doc.itinerary!.stops.map((s) => s.nights);
    expect(new Set(n).size).toBeGreaterThan(1);
  });
  it("detecta primera vez en Europa", () => expect(doc.profile.firstTimeEurope).toBe(true));
  it("las fechas son consecutivas", () => {
    const it2 = doc.itinerary!;
    expect(it2.days[0].date).toBe("2027-05-03");
    expect(it2.days[it2.days.length - 1].date).toBe("2027-05-24");
  });
});

describe("Escenario 3 — Eurotrip para quien ya conoce Madrid, París y Roma", () => {
  const a = answers({
    tripStyles: ["eurotrip"],
    dreamText: "Ya conozco Madrid, París y Roma. Quiero descubrir lugares diferentes",
    dates: { mode: "month", months: [9], nights: 16 },
    history: { visited: ["Madrid", "París", "Roma"], loved: [], wouldNotReturn: [], pending: [], avoid: [] },
  });
  const doc = generatePlan(a, ctx);
  it("cumple invariantes", () => assertInvariants(doc, 16));
  it("la alternativa principal evita las ciudades conocidas", () => {
    const ids = doc.alternatives[0].stops.map((s) => s.destinationId);
    expect(ids).not.toContain("madrid");
    expect(ids).not.toContain("paris");
    expect(ids).not.toContain("roma");
  });
});

describe("Escenario 4 — presupuesto muy limitado (mochilero)", () => {
  const a = answers({
    tripStyles: ["backpacker", "eurotrip"],
    party: { type: "solo", adults: 1, childrenAges: [] },
    budget: { tier: "backpacker" },
    dates: { mode: "month", months: [10], nights: 18 },
    priorities: { selected: ["optimize_budget", "many_places"], ranking: ["optimize_budget"], mustHave: ["optimize_budget"] },
  });
  const doc = generatePlan(a, ctx);
  it("cumple invariantes", () => assertInvariants(doc, 18));
  it("la mejor alternativa tiene un nivel de costos menor que el promedio europeo de la biblioteca", () => {
    const eu = lib.filter((d) => SUPER_REGION[d.cluster] === "europa");
    const avg = eu.reduce((x, d) => x + d.costLevel, 0) / eu.length;
    const best = doc.alternatives[0].stops.map((s) => lib.find((d) => d.id === s.destinationId)!.costLevel);
    expect(best.reduce((x, y) => x + y, 0) / best.length).toBeLessThan(avg);
  });
});

describe("Escenario 5 — viaje familiar con chicos", () => {
  const a = answers({
    tripStyles: ["family", "theme_parks"],
    party: { type: "family", adults: 2, childrenAges: [5, 9] },
    dates: { mode: "month", months: [7], nights: 10 },
  });
  const doc = generatePlan(a, ctx);
  it("cumple invariantes", () => assertInvariants(doc, 10));
  it("incluye Orlando (parques) entre las alternativas", () => {
    expect(doc.alternatives.some((x) => x.stops.some((s) => s.destinationId === "orlando"))).toBe(true);
  });
  it("advierte el calor del verano con chicos pequeños", () => {
    const orl = doc.alternatives.find((x) => x.stops.some((s) => s.destinationId === "orlando"))!;
    expect(orl.warnings.join(" ")).toMatch(/calor|huracanes/i);
  });
});

describe("Escenario 6 — viaje romántico", () => {
  const a = answers({
    tripStyles: ["romantic"],
    dreamText: "Viaje romántico con mi pareja, pueblos pintorescos, buenos restaurantes y hoteles especiales",
    dates: { mode: "month", months: [6], nights: 12 },
    budget: { tier: "comfort" },
  });
  const doc = generatePlan(a, ctx);
  it("cumple invariantes", () => assertInvariants(doc, 12));
  it("prioriza destinos con alto componente romántico", () => {
    const romance = doc.alternatives[0].stops.map((s) => lib.find((d) => d.id === s.destinationId)!.tags.romance ?? 0);
    expect(Math.max(...romance)).toBeGreaterThanOrEqual(2);
  });
  it("pregunta por el escenario romántico si no se definió destino", () => {
    const q = pickSmartQuestions(buildProfile(answers({ tripStyles: ["romantic"] }), lib), answers({ tripStyles: ["romantic"] }));
    expect(q.map((x) => x.id)).toContain("romantic_setting");
  });
});

describe("Escenario 7 — no sabe qué destino elegir", () => {
  const a = answers({ tripStyles: ["discover"], dates: { mode: "unknown", nights: 10 } });
  const doc = generatePlan(a, ctx);
  it("cumple invariantes", () => assertInvariants(doc, 10));
  it("la propuesta es exploratoria y lo explicita", () => {
    expect(doc.profile.exploratory).toBe(true);
    expect(doc.pendingInfo.join(" ")).toMatch(/exploratoria|Fecha/);
  });
  it("hace preguntas para descubrir regiones", () => {
    const q = pickSmartQuestions(doc.profile, a);
    expect(q.map((x) => x.id)).toContain("continents");
  });
});

describe("Escenario 8 — fechas flexibles", () => {
  const a = answers({ tripStyles: ["beach_relax"], dates: { mode: "month", months: [9], nights: 9, flexibilityDays: 30 } });
  const doc = generatePlan(a, ctx);
  it("cumple invariantes", () => assertInvariants(doc, 9));
  it("compara ventanas estacionales rotuladas como hipótesis", () => {
    expect(doc.seasonal.length).toBeGreaterThan(0);
    doc.seasonal.flatMap((s) => s.windows).forEach((w) => expect(w.hypothesis).toMatch(/[Hh]ipótesis/));
  });
});

describe("Escenario 9 — destino fuera de temporada", () => {
  const a = answers({ dreamText: "Quiero conocer la Costa Amalfitana", tripStyles: ["romantic"], dates: { mode: "month", months: [1], nights: 6 } });
  const doc = generatePlan(a, ctx);
  it("advierte cierres de temporada baja", () => {
    const amalfi = doc.alternatives.find((x) => x.stops.some((s) => s.destinationId === "amalfi"));
    expect(amalfi).toBeTruthy();
    expect(amalfi!.warnings.join(" ")).toMatch(/cierran|temporada baja/i);
  });
  it("no incluye actividades fuera de temporada", () => {
    const acts = doc.itinerary!.days.flatMap((d) => d.activities.map((x) => x.name));
    expect(acts).not.toContain("Excursión a Capri");
  });
});

describe("Escenario 10 — proyecto sin datos suficientes", () => {
  const a = answers({});
  const doc = generatePlan(a, ctx);
  it("reconoce lo que falta en lugar de inventar", () => {
    const keys = doc.profile.missing.map((m) => m.key);
    expect(keys).toContain("nights");
    expect(keys).toContain("dates");
  });
});

describe("Escenario 14 — solicitud de cambio de itinerario", () => {
  const a = answers({ tripStyles: ["eurotrip"], dates: { mode: "exact", departure: "2027-05-03", return: "2027-05-24" } });
  const doc = generatePlan(a, ctx);
  it("«menos ciudades» quita una parada y mantiene la duración", () => {
    const parsed = parseChangeRequest("Quiero menos ciudades", doc, lib);
    expect(parsed.ops[0].op).toBe("remove_stop");
    const next = applyChanges(doc, parsed.ops, a, ctx);
    expect(next.itinerary!.stops.length).toBe(doc.itinerary!.stops.length - 1);
    assertInvariants(next, 21);
  });
  it("respeta elementos bloqueados por el agente", () => {
    const locked = structuredClone(doc);
    locked.itinerary!.stops.forEach((s) => (s.locked = true));
    const parsed = parseChangeRequest("Quiero menos ciudades", locked, lib);
    expect(parsed.ops.length).toBe(0);
    expect(parsed.conflicts.length).toBeGreaterThan(0);
  });
  it("«cambiar X por Y» conserva el resto de la ruta", () => {
    const first = doc.itinerary!.stops[0];
    const target = lib.find((d) => SUPER_REGION[d.cluster] === "europa" && !doc.itinerary!.stops.some((s) => s.destinationId === d.id))!;
    const parsed = parseChangeRequest(`Quiero cambiar ${first.name} por ${target.name}`, doc, lib);
    const next = applyChanges(doc, parsed.ops, a, ctx);
    const before = doc.itinerary!.stops.slice(1).map((s) => s.destinationId);
    const after = next.itinerary!.stops.map((s) => s.destinationId);
    before.forEach((id) => expect(after).toContain(id));
    expect(after).toContain(target.id);
    assertInvariants(next, 21);
  });
  it("una actividad bloqueada sobrevive a un recálculo de ritmo", () => {
    const d2 = structuredClone(doc);
    const act = d2.itinerary!.days.find((d) => d.activities.length)!.activities[0];
    act.locked = true;
    act.name = "Cena especial reservada por el agente";
    const next = applyChanges(d2, [{ op: "set_pace", pace: "relaxed" }], a, ctx);
    expect(next.itinerary!.days.flatMap((d) => d.activities.map((x) => x.name))).toContain("Cena especial reservada por el agente");
  });
});

describe("Escenario 15 — propuesta con cotizaciones manuales", () => {
  it("calcula subtotales, impuestos, margen y precio por persona con decimales exactos", () => {
    const r = computeQuote({
      currency: "USD",
      travelers: 2,
      lines: [
        { id: "1", category: "flight_out", description: "Ida", quantity: "1", unitAmount: "700.10", currency: "USD", perPerson: true },
        { id: "2", category: "lodging", description: "Hotel", quantity: "7", unitAmount: "100", currency: "EUR", fxRate: "1.1" },
      ],
      taxes: [{ label: "Impuesto X", mode: "percent", value: "10" }],
      marginPercent: "12",
      managementFee: "50",
    });
    expect(r.ok).toBe(true);
    expect(r.servicesTotal).toBe("2170.20"); // 1400.20 + 770
    expect(r.taxesTotal).toBe("217.02");
    expect(r.marginAmount).toBe("286.47"); // 12% de 2387.22
    expect(r.finalPrice).toBe("2723.69");
    expect(r.perPerson).toBe("1361.84");
  });
  it("no asume tipo de cambio", () => {
    const r = computeQuote({
      currency: "USD",
      travelers: 1,
      lines: [{ id: "1", category: "lodging", description: "Hotel", quantity: "1", unitAmount: "100", currency: "EUR" }],
      taxes: [],
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/tipo de cambio/);
  });
});

describe("Escenario 18 — la propuesta pública no expone precios", () => {
  const doc = generatePlan(answers({ tripStyles: ["beach_relax"], dates: { mode: "month", months: [2], nights: 7 } }), ctx);
  it("la vista del cliente no contiene importes", () => {
    const view = toClientProposal(doc, "preliminary");
    expect(scanForMoney(view)).toEqual([]);
    expect(JSON.stringify(view)).not.toMatch(/budget_amount|marginPercent|unitAmount/);
  });
  it("si un texto con importes se cuela en el plan, se elimina de la vista", () => {
    const dirty = structuredClone(doc);
    dirty.recommendations.push("Hotel por USD 250 la noche");
    dirty.itinerary!.days[1].freeTime = "Cena de $ 80 por persona";
    const view = toClientProposal(dirty, "preliminary");
    expect(JSON.stringify(view)).not.toMatch(/USD 250|\$ 80/);
  });
  it("el escáner detecta importes en distintos formatos", () => {
    expect(scanForMoney({ a: "US$ 1.200" }).length).toBe(1);
    expect(scanForMoney({ a: ["1500 dólares"] }).length).toBe(1);
    expect(scanForMoney({ a: "margen del 12%" }).length).toBe(1);
    expect(scanForMoney({ a: "Ideal para descansar" }).length).toBe(0);
  });
});

describe("Destinos ya conocidos (ajuste pedido por la agencia)", () => {
  const all = (doc: PlanDocument) => doc.alternatives.flatMap((a) => a.stops.map((s) => s.destinationId));
  it("no ofrece en NINGUNA alternativa las ciudades que el cliente ya visitó", () => {
    const doc = generatePlan(answers({ tripStyles: ["eurotrip"], dates: { mode: "month", months: [9], nights: 14 }, history: { visited: ["Madrid", "París", "Roma", "Barcelona"], loved: [], wouldNotReturn: [], pending: [], avoid: [] } }), ctx);
    for (const id of ["madrid", "paris", "roma", "barcelona"]) expect(all(doc)).not.toContain(id);
  });
  it("«ya conozco X» en el texto libre no convierte X en un deseo", () => {
    const doc = generatePlan(answers({ tripStyles: ["eurotrip"], dreamText: "Ya conozco Madrid, París y Roma. Quiero descubrir lugares diferentes", dates: { mode: "month", months: [5], nights: 15 } }), ctx);
    expect(doc.profile.wishIds).not.toContain("madrid");
    for (const id of ["madrid", "paris", "roma"]) expect(all(doc)).not.toContain(id);
  });
  it("si declara países conocidos, evita sus destinos clásicos", () => {
    const doc = generatePlan(answers({ tripStyles: ["big_cities"], dates: { mode: "month", months: [5], nights: 12 }, history: { visited: ["España", "Italia"], loved: [], wouldNotReturn: [], pending: [], avoid: [] } }), ctx);
    for (const id of ["madrid", "barcelona", "roma", "florencia"]) expect(all(doc)).not.toContain(id);
  });
  it("playa: no repite Punta Cana ni Riviera Maya si ya fue", () => {
    const doc = generatePlan(answers({ tripStyles: ["beach_relax"], dates: { mode: "month", months: [2], nights: 10 }, history: { visited: ["Punta Cana", "Cancún"], loved: [], wouldNotReturn: [], pending: [], avoid: [] } }), ctx);
    expect(all(doc)).not.toContain("punta-cana");
    expect(all(doc)).not.toContain("riviera-maya");
  });
  it("si pide incluir lugares conocidos, pueden aparecer", () => {
    const doc = generatePlan(answers({ tripStyles: ["eurotrip"], dates: { mode: "month", months: [5], nights: 15 }, history: { visited: ["París"], loved: ["París"], wouldNotReturn: [], pending: [], avoid: [] }, extra: { include_known: "yes" } }), ctx);
    expect(doc.profile.includeKnown).toBe(true);
  });
  it("playa en Europa con pocas opciones nuevas: alarga estadías antes de repetir lugares conocidos", () => {
    const doc = generatePlan(answers({ tripStyles: ["beach_relax"], dreamText: "Ya conozco Madrid, París y Roma, quiero algo distinto en Europa 15 días" }), ctx);
    for (const id of ["madrid", "paris", "roma"]) expect(all(doc)).not.toContain(id);
    expect(doc.checks.map((c) => c.code)).not.toContain("known_included");
  });
  it("«no quiero ir a X» excluye X", () => {
    const doc = generatePlan(answers({ tripStyles: ["eurotrip"], dreamText: "Quiero Europa pero no quiero ir a Londres", dates: { mode: "month", months: [5], nights: 15 } }), ctx);
    expect(all(doc)).not.toContain("londres");
  });
});
