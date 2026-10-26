import { KNOWN_CONNECTIONS, SEED_DESTINATIONS } from "@/core/library";
import type { IntakeAnswers } from "@/core/types";

export const ctx = { library: SEED_DESTINATIONS, connections: KNOWN_CONNECTIONS, now: new Date("2026-10-26T12:00:00Z") };

export function answers(over: Partial<IntakeAnswers> = {}): IntakeAnswers {
  return {
    tripStyles: [],
    dates: { mode: "unknown" },
    origin: { city: "Buenos Aires", country: "Argentina" },
    party: { type: "couple", adults: 2, childrenAges: [] },
    budget: { tier: "moderate" },
    priorities: { selected: [], ranking: [], mustHave: [] },
    history: { visited: [], loved: [], wouldNotReturn: [], pending: [], avoid: [] },
    stay: { lodgingTypes: [], transport: ["plane", "train"] },
    extra: {},
    ...over,
  };
}
