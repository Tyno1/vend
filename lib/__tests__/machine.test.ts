import { describe, expect, it } from "@jest/globals";
import { coinCounts } from "../coins";
import { Machine } from "../machine";
import type { CoinCounts } from "../types";

function stockOf(partial: Partial<CoinCounts>): CoinCounts {
  return { ...coinCounts(0), ...partial };
}

const buy = (customer: string, price: number, amountPaid: number) => ({ customer, price, amountPaid });

describe("Machine.purchase", () => {
  it("starts with ten of each UK coin", () => {
    expect(new Machine().remainingCoins()).toEqual({ coinsForChange: coinCounts(10), totalPence: 3880 });
  });

  it("dispenses with change and takes those coins from the supply", () => {
    const machine = new Machine();
    const outcome = machine.purchase(buy("Ada", 60, 100), 0);

    expect(outcome.status).toBe(200);
    expect(outcome.body.ok && outcome.body.change).toEqual([{ denomination: 20, count: 2 }]);
    expect(machine.remainingCoins().coinsForChange[20]).toBe(8);
  });

  it("does not add the payment to the coins for change", () => {
    const machine = new Machine();
    machine.purchase(buy("Ada", 150, 200), 0);
    // A £2 was paid in, but the supply only loses the 50p handed back.
    expect(machine.remainingCoins().coinsForChange[200]).toBe(10);
    expect(machine.remainingCoins().totalPence).toBe(3880 - 50);
  });

  it("needs no change for an exact payment", () => {
    const machine = new Machine();
    const outcome = machine.purchase(buy("Ada", 60, 60), 0);

    expect(outcome.status).toBe(200);
    expect(outcome.body.ok && outcome.body.change).toEqual([]);
    expect(machine.remainingCoins().coinsForChange).toEqual(coinCounts(10));
  });

  it("refuses a short payment and leaves the supply unchanged", () => {
    const machine = new Machine();
    const outcome = machine.purchase(buy("Ada", 60, 50), 0);

    expect(outcome.status).toBe(422);
    expect(!outcome.body.ok && outcome.body.reason).toBe("insufficient_payment");
    expect(machine.remainingCoins().coinsForChange).toEqual(coinCounts(10));
  });

  it("refuses when change cannot be made and leaves the supply unchanged", () => {
    const stock = stockOf({ 50: 1 });
    const machine = new Machine(stock);
    const outcome = machine.purchase(buy("Ada", 60, 100), 0);

    expect(outcome.status).toBe(422);
    expect(!outcome.body.ok && outcome.body.reason).toBe("cannot_make_change");
    expect(machine.remainingCoins().coinsForChange).toEqual(stock);
  });

  it("only ever runs the supply down, and manages once a coin runs out", () => {
    const machine = new Machine(stockOf({ 20: 1, 10: 2 }));

    expect(machine.purchase(buy("a", 80, 100), 0).status).toBe(200); // 1 × 20p
    expect(machine.remainingCoins().coinsForChange[20]).toBe(0);

    const next = machine.purchase(buy("b", 80, 100), 0); // 20p made from 2 × 10p
    expect(next.body.ok && next.body.change).toEqual([{ denomination: 10, count: 2 }]);

    expect(machine.purchase(buy("c", 80, 100), 0).status).toBe(422); // nothing left
    expect(machine.remainingCoins().totalPence).toBe(0);
  });

  it("rejects unreadable input with 400", () => {
    const machine = new Machine();
    expect(machine.purchase(null, 0).status).toBe(400);
    expect(machine.purchase(buy("", 60, 60), 0).status).toBe(400);
    expect(machine.purchase(buy("Ada", 0, 60), 0).status).toBe(400);
    expect(machine.purchase({ customer: "Ada", price: "60", amountPaid: 60 }, 0).status).toBe(400);
    expect(machine.purchase(buy("Ada", 60, 60.5), 0).status).toBe(400);
    expect(machine.purchase(buy("x".repeat(41), 60, 60), 0).status).toBe(400);
  });
});

describe("rate limit", () => {
  it("allows three purchases per name in three seconds and refuses the fourth", () => {
    const machine = new Machine();
    for (const at of [0, 1000, 2000]) expect(machine.purchase(buy("Ada", 60, 60), at).status).toBe(200);
    const fourth = machine.purchase(buy("Ada", 60, 60), 2999);

    expect(fourth.status).toBe(429);
    expect(!fourth.body.ok && fourth.body.retryAfterMs).toBe(1);
  });

  it("lets the name back in once the oldest purchase is three seconds old", () => {
    const machine = new Machine();
    for (const at of [0, 1000, 2000]) machine.purchase(buy("Ada", 60, 60), at);
    expect(machine.purchase(buy("Ada", 60, 60), 3000).status).toBe(200);
  });

  it("turns the customer away before checking the price or making change", () => {
    const machine = new Machine();
    for (const at of [0, 1, 2]) machine.purchase(buy("Ada", 60, 60), at);

    // Short payment and an impossible price would be 422 / 400, but the limit wins.
    expect(machine.purchase(buy("Ada", 60, 1), 3).status).toBe(429);
    expect(machine.purchase(buy("Ada", 0, 60), 4).status).toBe(429);
    expect(machine.remainingCoins().coinsForChange).toEqual(coinCounts(10));
  });

  it("counts refused attempts towards the limit", () => {
    const machine = new Machine();
    for (const at of [0, 1, 2]) expect(machine.purchase(buy("Ada", 60, 1), at).status).toBe(422);
    expect(machine.purchase(buy("Ada", 60, 60), 3).status).toBe(429);
  });

  it("does not let a refused-for-limit attempt extend the wait", () => {
    const machine = new Machine();
    for (const at of [0, 1, 2]) machine.purchase(buy("Ada", 60, 60), at);
    for (const at of [100, 200, 2999]) machine.purchase(buy("Ada", 60, 60), at);
    expect(machine.purchase(buy("Ada", 60, 60), 3000).status).toBe(200);
  });

  it("keeps each customer's limit independent", () => {
    const machine = new Machine();
    for (const at of [0, 1, 2]) machine.purchase(buy("Ada", 60, 60), at);
    expect(machine.purchase(buy("Ada", 60, 60), 3).status).toBe(429);
    expect(machine.purchase(buy("Bea", 60, 60), 3).status).toBe(200);
  });

  it("treats spacing and letter case as the same customer", () => {
    const machine = new Machine();
    machine.purchase(buy("Ada", 60, 60), 0);
    machine.purchase(buy(" ada ", 60, 60), 1);
    machine.purchase(buy("ADA", 60, 60), 2);
    expect(machine.purchase(buy("aDa", 60, 60), 3).status).toBe(429);
  });

  it("does not count a purchase with no name", () => {
    const machine = new Machine();
    for (const at of [0, 1, 2, 3]) expect(machine.purchase(buy("  ", 60, 60), at).status).toBe(400);
    expect(machine.purchase(buy("Ada", 60, 60), 4).status).toBe(200);
  });
});
