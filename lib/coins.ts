import type { CoinCounts, CoinMetal, Denomination } from "./types";

export const DENOMINATIONS = [200, 100, 50, 20, 10, 5, 2, 1] as const satisfies readonly Denomination[];

export function coinCounts(howManyOfEach = 10): CoinCounts {
  return {
    200: howManyOfEach,
    100: howManyOfEach,
    50: howManyOfEach,
    20: howManyOfEach,
    10: howManyOfEach,
    5: howManyOfEach,
    2: howManyOfEach,
    1: howManyOfEach,
  };
}

export function coinLabel(denomination: Denomination): string {
  if (denomination >= 100) return `£${denomination / 100}`;
  return `${denomination}p`;
}

export function coinMetal(denomination: Denomination): CoinMetal {
  if (denomination <= 2) return "copper";
  if (denomination <= 50) return "silver";
  return "gold";
}

export function formatPence(pence: number): string {
  const sign = pence < 0 ? "−" : "";
  const absolute = Math.abs(pence);
  const pounds = Math.floor(absolute / 100);
  const penceRemainder = absolute % 100;
  if (pounds === 0) return `${sign}${penceRemainder}p`;
  if (penceRemainder === 0) return `${sign}£${pounds}`;
  return `${sign}£${pounds}.${penceRemainder.toString().padStart(2, "0")}`;
}

export function totalPence(counts: CoinCounts): number {
  return DENOMINATIONS.reduce(
    (sum, denomination) => sum + denomination * counts[denomination],
    0,
  );
}
