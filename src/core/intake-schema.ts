import { z } from "zod";
import { BUDGET_TIERS, LODGING_TYPES, PRIORITIES, TRANSPORT_MODES, TRIP_STYLES } from "./types";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const shortText = (max: number) => z.string().trim().max(max);
const list = z.array(shortText(80)).max(40);

/**
 * Validación del cuestionario. Se usa en el navegador y SIEMPRE en el servidor.
 * El texto libre se trata como dato: nunca como instrucción para el sistema.
 */
export const intakeSchema = z
  .object({
    tripStyles: z.array(z.enum(TRIP_STYLES)).max(6),
    dreamText: shortText(1500).optional(),
    dates: z.object({
      mode: z.enum(["exact", "month", "unknown"]),
      departure: isoDate.optional(),
      return: isoDate.optional(),
      months: z.array(z.number().int().min(1).max(12)).max(12).optional(),
      year: z.number().int().min(2024).max(2035).optional(),
      flexibilityDays: z.number().int().min(0).max(120).optional(),
      nights: z.number().int().min(1).max(90).optional(),
      canExtend: z.boolean().optional(),
      canShorten: z.boolean().optional(),
    }),
    origin: z.object({
      city: shortText(80).min(2),
      country: shortText(80).min(2),
      airport: z.string().trim().regex(/^[A-Za-z]{3}$/).optional().or(z.literal("")).transform((v) => v || undefined),
      altAirportOk: z.boolean().optional(),
      flightPref: z.enum(["direct", "few_stops", "any"]).optional(),
      longLayoverOk: z.boolean().optional(),
      overnightOk: z.boolean().optional(),
    }),
    party: z.object({
      type: z.enum(["solo", "couple", "friends", "family", "group", "other"]),
      adults: z.number().int().min(1).max(40),
      childrenAges: z.array(z.number().int().min(0).max(17)).max(15),
      mobility: z.enum(["none", "reduced", "wheelchair"]).optional(),
      accessibilityNotes: shortText(400).optional(),
    }),
    budget: z.object({
      tier: z.enum(BUDGET_TIERS),
      per: z.enum(["person", "group"]).optional(),
      includes: z.record(z.string(), z.boolean()).optional(),
      flexibility: z.enum(["none", "some", "high"]).optional(),
    }),
    priorities: z.object({
      selected: z.array(z.enum(PRIORITIES)).max(17),
      ranking: z.array(z.enum(PRIORITIES)).max(17),
      mustHave: z.array(z.enum(PRIORITIES)).max(5),
    }),
    history: z.object({
      visited: list,
      loved: list,
      wouldNotReturn: list,
      pending: list,
      avoid: list,
      repeatExperiences: shortText(400).optional(),
    }),
    stay: z.object({
      lodgingTypes: z.array(z.enum(LODGING_TYPES)).max(9),
      transport: z.array(z.enum(TRANSPORT_MODES)).max(7),
      lodgingPriority: z.enum(["price", "location", "comfort", "views", "services", "experience"]).optional(),
      noCarRental: z.boolean().optional(),
    }),
    extra: z.record(z.string().max(40), z.union([shortText(200), z.array(shortText(60)).max(10)])),
  })
  .superRefine((v, ctx) => {
    if (v.dates.mode === "exact") {
      if (!v.dates.departure || !v.dates.return) ctx.addIssue({ code: "custom", path: ["dates"], message: "Indicá fecha de salida y de regreso." });
      else if (v.dates.return <= v.dates.departure) ctx.addIssue({ code: "custom", path: ["dates", "return"], message: "La fecha de regreso debe ser posterior a la de salida." });
      else {
        const nights = (Date.parse(v.dates.return) - Date.parse(v.dates.departure)) / 86400000;
        if (nights > 90) ctx.addIssue({ code: "custom", path: ["dates"], message: "Por ahora planificamos viajes de hasta 90 noches." });
      }
    }
    if (v.party.type === "family" && v.party.childrenAges.length === 0 && v.party.adults < 2) {
      // permitido, pero el sistema lo marcará como dato faltante
    }
  });

/** Monto de presupuesto: viaja aparte del cuestionario y se guarda solo en el esquema interno. */
export const budgetAmountSchema = z
  .object({
    amount: z.number().positive().max(10_000_000),
    currency: z.enum(["USD", "ARS", "EUR"]),
    per: z.enum(["person", "group"]),
  })
  .optional();

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200).optional().or(z.literal("")).transform((v) => v || undefined),
  phone: z.string().trim().regex(/^[+\d\s()-]{6,25}$/).optional().or(z.literal("")).transform((v) => v || undefined),
  preferredChannel: z.enum(["whatsapp", "email", "phone"]),
  message: z.string().trim().max(1500).optional(),
  consent: z.literal(true, { message: "Necesitamos tu consentimiento para contactarte." }),
}).refine((v) => v.email || v.phone, { message: "Dejanos un email o un teléfono.", path: ["email"] });
