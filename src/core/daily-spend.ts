import { SUPER_REGION } from "./library";
import type { BudgetTier, Destination } from "./types";

/**
 * Gastos diarios orientativos por persona (comidas, transporte local y entradas; SIN alojamiento
 * ni vuelos). Es una referencia de la agencia, editable en Ajustes, no una cotización.
 * Valores por nivel de costo del destino (1 = económico … 5 = muy caro).
 */
export interface DailySpendTable {
  USD: [number, number][];
  EUR: [number, number][];
  tierFactor: Record<string, number>;
}

export const DEFAULT_DAILY_SPEND: DailySpendTable = {
  USD: [
    [25, 45],
    [40, 65],
    [60, 95],
    [85, 130],
    [120, 180],
  ],
  EUR: [
    [25, 40],
    [35, 60],
    [55, 85],
    [80, 120],
    [110, 165],
  ],
  tierFactor: { backpacker: 0.7, economic: 0.85, moderate: 1, comfort: 1.25, premium: 1.6, unlimited: 2.2 },
};

export interface DailySpend {
  stopId: string;
  name: string;
  nights: number;
  low: number;
  high: number;
  currency: "USD" | "EUR";
}

const round5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);

export function dailySpendFor(dest: Destination, tier: BudgetTier, table: DailySpendTable = DEFAULT_DAILY_SPEND): Omit<DailySpend, "stopId" | "name" | "nights"> {
  const currency = SUPER_REGION[dest.cluster] === "europa" ? "EUR" : "USD";
  const [low, high] = table[currency][Math.min(4, Math.max(0, dest.costLevel - 1))] ?? DEFAULT_DAILY_SPEND[currency][2];
  const f = table.tierFactor[tier] ?? 1;
  return { low: round5(low * f), high: round5(high * f), currency };
}
