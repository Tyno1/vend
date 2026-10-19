export type Denomination = 200 | 100 | 50 | 20 | 10 | 5 | 2 | 1;

export type CoinCounts = Record<Denomination, number>;

export type ChangeCoin = {
  denomination: Denomination;
  count: number;
};

export type CoinMetal = "copper" | "silver" | "gold";

export type ProductArt =
  | "bottle"
  | "bubbles"
  | "can"
  | "cup"
  | "bag"
  | "bar"
  | "tin"
  | "apple"
  | "roll";

export type Product = {
  code: string;
  name: string;
  detail: string;
  price: number;
  art: ProductArt;
  color: string;
};

export type PurchaseSuccess = {
  ok: true;
  message: string;
  customer: string;
  price: number;
  amountPaid: number;
  change: ChangeCoin[];
  changeInPence: number;
  coinsForChange: CoinCounts;
};

export type RefusalReason =
  | "invalid"
  | "rate_limited"
  | "insufficient_payment"
  | "cannot_make_change";

export type PurchaseRefusal = {
  ok: false;
  reason: RefusalReason;
  message: string;
  retryAfterMs?: number;
  coinsForChange: CoinCounts;
  customer?: string;
  price?: number;
  amountPaid?: number;
  changeInPence?: number;
};

export type PurchaseResponse = PurchaseSuccess | PurchaseRefusal;

export type GetMachineStateReturnType = {
  coinsForChange: CoinCounts;
  totalPence: number;
};

export type PurchaseReturnType = {
  status: 200 | 400 | 422 | 429;
  body: PurchaseResponse;
};

export type MakeChangeReturnType = ChangeCoin[] | null;

export type ParsedPurchase =
  | { kind: "unreadable"; message: string }
  | { kind: "invalid_amounts"; customer: string; nameInLowerCase: string; message: string }
  | { kind: "ready"; customer: string; nameInLowerCase: string; price: number; amountPaid: number };

export type Drawer =
  | { kind: "empty" }
  | { kind: "message"; title: string; message: string }
  | { kind: "result"; response: PurchaseResponse; item?: Product };

export type FewestSoFar = {
  numberOfCoins: number;
  countOfEach: number[];
};
