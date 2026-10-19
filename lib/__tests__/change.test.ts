import { describe, expect, it } from "@jest/globals";
import { makeChange } from "../change";
import { DENOMINATIONS, coinCounts } from "../coins";
import type { ChangeCoin, CoinCounts } from "../types";

function stockOf(partial: Partial<CoinCounts>): CoinCounts {
  return { ...coinCounts(0), ...partial };
}

function coinTotal(change: ChangeCoin[]): number {
  return change.reduce((sum, coin) => sum + coin.count, 0);
}

function penceTotal(change: ChangeCoin[]): number {
  return change.reduce((sum, coin) => sum + coin.count * coin.denomination, 0);
}

// Tries every combination. Slow, but obviously correct, so it is a reference for small stocks.
function fewestCoinsByBruteForce(amount: number, stock: CoinCounts): number | null {
  let best: number | null = null;
  const search = (index: number, left: number, used: number) => {
    if (left === 0) {
      if (best === null || used < best) best = used;
      return;
    }
    const denomination = DENOMINATIONS[index];
    if (denomination === undefined) return;
    for (let take = Math.min(stock[denomination], Math.floor(left / denomination)); take >= 0; take -= 1) {
      search(index + 1, left - take * denomination, used + take);
    }
  };
  search(0, amount, 0);
  return best;
}

describe("makeChange", () => {
  it("returns no coins for zero change", () => {
    expect(makeChange(0, coinCounts())).toEqual([]);
  });

  it("uses the fewest coins from a full machine", () => {
    expect(makeChange(388, coinCounts())).toEqual([
      { denomination: 200, count: 1 },
      { denomination: 100, count: 1 },
      { denomination: 50, count: 1 },
      { denomination: 20, count: 1 },
      { denomination: 10, count: 1 },
      { denomination: 5, count: 1 },
      { denomination: 2, count: 1 },
      { denomination: 1, count: 1 },
    ]);
  });

  it("finds an answer where taking the biggest coin first would fail", () => {
    // Greedy takes the 50p and then cannot make the last 10p. Three 20p coins work.
    expect(makeChange(60, stockOf({ 50: 1, 20: 3 }))).toEqual([{ denomination: 20, count: 3 }]);
  });

  it("manages without a denomination that has run out", () => {
    expect(makeChange(50, stockOf({ 50: 0, 20: 2, 10: 1 }))).toEqual([
      { denomination: 20, count: 2 },
      { denomination: 10, count: 1 },
    ]);
  });

  it("never uses more of a coin than the machine holds", () => {
    expect(makeChange(4, stockOf({ 2: 1, 1: 2 }))).toEqual([
      { denomination: 2, count: 1 },
      { denomination: 1, count: 2 },
    ]);
  });

  it("returns null when the change cannot be made", () => {
    expect(makeChange(3, stockOf({ 2: 5 }))).toBeNull();
    expect(makeChange(1, coinCounts(0))).toBeNull();
    expect(makeChange(5000, coinCounts())).toBeNull();
  });

  it("does not change the stock it is given", () => {
    const stock = coinCounts();
    makeChange(388, stock);
    expect(stock).toEqual(coinCounts());
  });

  it("rejects amounts that are not whole, non-negative pence", () => {
    expect(makeChange(-1, coinCounts())).toBeNull();
    expect(makeChange(1.5, coinCounts())).toBeNull();
    expect(makeChange(Number.NaN, coinCounts())).toBeNull();
  });

  it("matches a brute-force search on thousands of random stocks", () => {
    let seed = 42;
    const random = (below: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed % below;
    };

    for (let trial = 0; trial < 3000; trial += 1) {
      const stock = coinCounts(0);
      for (const denomination of DENOMINATIONS) stock[denomination] = random(4);
      const amount = random(400);

      const change = makeChange(amount, stock);
      const expected = fewestCoinsByBruteForce(amount, stock);

      if (expected === null) {
        expect(change).toBeNull();
        continue;
      }
      expect(change).not.toBeNull();
      if (change === null) continue;
      expect(penceTotal(change)).toBe(amount);
      expect(coinTotal(change)).toBe(expected);
      for (const coin of change) expect(coin.count).toBeLessThanOrEqual(stock[coin.denomination]);
    }
  });
});
