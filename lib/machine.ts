import { makeChange } from "./change";
import { coinCounts, coinLabel, formatPence, totalPence } from "./coins";
import type {
  ChangeCoin,
  CoinCounts,
  GetMachineStateReturnType,
  ParsedPurchase,
  PurchaseRefusal,
  PurchaseReturnType,
} from "./types";

const MAX_PURCHASES_IN_WINDOW = 3;
const PURCHASE_WINDOW_MS = 3000;
const NAME_LIMIT = 40;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function wholePence(value: unknown, minimum: number): number | null {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum) return null;
  return value;
}

function parsePurchase(input: unknown): ParsedPurchase {
  if (!isRecord(input)) {
    return {
      kind: "unreadable",
      message:
        "That purchase couldn't be read. Send a name, a price in pence, and the amount paid.",
    };
  }

  const record = input;
  if (typeof record.customer !== "string" || record.customer.trim() === "") {
    return {
      kind: "unreadable",
      message: "Enter a name so this purchase can be counted against the right person.",
    };
  }

  const customer = record.customer.trim();
  if (customer.length > NAME_LIMIT) {
    return {
      kind: "unreadable",
      message: `Use a name of ${NAME_LIMIT} characters or fewer.`,
    };
  }

  const nameInLowerCase = customer.toLowerCase();
  const price = wholePence(record.price, 1);
  const amountPaid = wholePence(record.amountPaid, 0);
  if (price === null || amountPaid === null) {
    return {
      kind: "invalid_amounts",
      customer,
      nameInLowerCase,
      message: "Use a price of at least 1p, and pay in whole pence.",
    };
  }

  return {
    kind: "ready",
    customer,
    nameInLowerCase,
    price,
    amountPaid,
  };
}


export class Machine {
  private coinsForChange: CoinCounts;
  private purchaseTimesByCustomer = new Map<string, number[]>();

  constructor(coinsForChange: CoinCounts = coinCounts()) {
    this.coinsForChange = { ...coinsForChange };
  }

  remainingCoins(): GetMachineStateReturnType {
    return {
      coinsForChange: { ...this.coinsForChange },
      totalPence: totalPence(this.coinsForChange),
    };
  }

  purchase(input: unknown, now = Date.now()): PurchaseReturnType {
    const parsed = parsePurchase(input);
    if (parsed.kind === "unreadable") {
      return this.refusal(400, {
        reason: "invalid",
        message: parsed.message,
      });
    }

    const millisecondsToWait = this.notePurchase(parsed.nameInLowerCase, now);
    if (millisecondsToWait !== null) {
      const seconds = PURCHASE_WINDOW_MS / 1000;
      return this.refusal(429, {
        reason: "rate_limited",
        message: `${parsed.customer} has already made ${MAX_PURCHASES_IN_WINDOW} purchases in ${seconds} seconds. Wait a moment. Your money is still yours, and the coins for change are unchanged.`,
        retryAfterMs: millisecondsToWait,
        customer: parsed.customer,
      });
    }

    if (parsed.kind === "invalid_amounts") {
      return this.refusal(400, {
        reason: "invalid",
        message: parsed.message,
        customer: parsed.customer,
      });
    }

    const { customer, price, amountPaid } = parsed;
    if (amountPaid < price) {
      return this.refusal(422, {
        reason: "insufficient_payment",
        message: `${formatPence(amountPaid)} is short of the ${formatPence(price)} price. Your money is still yours, and the coins for change are unchanged.`,
        customer,
        price,
        amountPaid,
      });
    }

    const changeInPence = amountPaid - price;
    const change = makeChange(changeInPence, this.coinsForChange);
    if (!change) {
      return this.refusal(422, {
        reason: "cannot_make_change",
        message: `The machine can't make ${formatPence(changeInPence)} in change from the coins it has left. Your money is still yours, and those coins are unchanged.`,
        customer,
        price,
        amountPaid,
        changeInPence,
      });
    }

    for (const coin of change) {
      this.coinsForChange[coin.denomination] -= coin.count;
    }

    const message =
      changeInPence === 0
        ? "Exact amount. There is no change."
        : `Change ${formatPence(changeInPence)}: ${describeChange(change)}.`;

    return {
      status: 200,
      body: {
        ok: true,
        message,
        customer,
        price,
        amountPaid,
        change,
        changeInPence,
        coinsForChange: { ...this.coinsForChange },
      },
    };
  }

  private refusal(
    status: PurchaseReturnType["status"],
    body: Omit<PurchaseRefusal, "ok" | "coinsForChange">,
  ): PurchaseReturnType {
    return {
      status,
      body: {
        ok: false,
        coinsForChange: { ...this.coinsForChange },
        ...body,
      },
    };
  }

  private notePurchase(nameInLowerCase: string, now: number): number | null {
    const recent = (this.purchaseTimesByCustomer.get(nameInLowerCase) ?? []).filter(
      (timestamp) => now - timestamp < PURCHASE_WINDOW_MS,
    );

    if (recent.length >= MAX_PURCHASES_IN_WINDOW) {
      this.purchaseTimesByCustomer.set(nameInLowerCase, recent);
      return Math.max(0, (recent[0] ?? now) + PURCHASE_WINDOW_MS - now);
    }

    recent.push(now);
    this.purchaseTimesByCustomer.set(nameInLowerCase, recent);
    return null;
  }
}

let machine: Machine | null = null;

export function getMachine(): Machine {
  if (machine === null) machine = new Machine();
  return machine;
}

export function resetMachine(): void {
  machine = null;
}

function describeChange(change: ChangeCoin[]): string {
  return change
    .map((coin) => `${coin.count} × ${coinLabel(coin.denomination)}`)
    .join(", ");
}
