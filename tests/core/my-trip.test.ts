import { describe, expect, it } from "vitest";
import { buildPlan, calendarWeeks, flag, tripPhase } from "@/core/my-trip";

describe("Mi viaje", () => {
  it("cronograma: semanas de lunes a domingo con cuenta regresiva antes de salir", () => {
    const w = calendarWeeks("2027-05-14", "2027-06-08"); // viernes → martes
    expect(w[0][0].date).toBe("2027-05-10");
    expect(w[0][0].countdown).toBe(4);
    expect(w[0][4].inTrip).toBe(true);
    expect(w.at(-1)!.at(-1)!.date).toBe("2027-06-13");
    expect(w.every((x) => x.length === 7)).toBe(true);
  });
  it("fases del viaje", () => {
    expect(tripPhase("2027-05-14", "2027-06-08", "2027-05-10")).toEqual({ kind: "before", days: 4 });
    expect(tripPhase("2027-05-14", "2027-06-08", "2027-05-16")).toEqual({ kind: "during", day: 3, total: 26 });
    expect(tripPhase("2027-05-14", "2027-06-08", "2027-06-09").kind).toBe("after");
  });
  it("banderas", () => {
    expect(flag("it")).toBe("🇮🇹");
    expect(flag("xyz")).toBe("");
  });
  it("plan automático: ciudad por hotel, vuelos en su día y respeta lo cargado", () => {
    const items = [
      { id: "h", kind: "hotel", title: "Hotel Roma", place: "Roma", startDate: "2027-05-15", startTime: "13:00", endDate: "2027-05-17", endTime: "11:00" },
      { id: "f", kind: "flight", title: "Buenos Aires → Roma", place: "", startDate: "2027-05-14", startTime: "22:35", endDate: null, endTime: "" },
    ];
    const existing = [{ date: "2027-05-16", city: "Roma", countryCode: "IT", summary: "Día completo en Roma", entries: [{ time: "10:00", title: "Free tour", text: "", link: "", photo: "", itemId: "" }] }];
    const plan = buildPlan("2027-05-14", "2027-05-17", existing, items, (p) => (p === "Roma" ? "IT" : ""));
    expect(plan).toHaveLength(4);
    expect(plan[0].entries[0].title).toBe("Buenos Aires → Roma");
    expect(plan[1]).toMatchObject({ city: "Roma", countryCode: "IT" });
    expect(plan[2].summary).toBe("Día completo en Roma");
    expect(plan[2].entries).toHaveLength(1);
    expect(plan[3].city).toBe("");
    // Idempotente: no duplica el vuelo.
    expect(buildPlan("2027-05-14", "2027-05-17", plan, items)[0].entries).toHaveLength(1);
  });
});
