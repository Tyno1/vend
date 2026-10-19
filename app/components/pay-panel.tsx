"use client";

import type { SubmitEvent } from "react";
import { DENOMINATIONS, coinLabel, coinMetal, formatPence } from "@/lib/coins";
import type { Denomination, Product } from "@/lib/types";
import { coinBackground } from "./coin-background";

const heading = "text-xs font-semibold tracking-label text-muted uppercase";
const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const pressable = `cursor-pointer hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100 ${focusRing}`;

export function PayPanel({
  nameId,
  name,
  onNameChange,
  selectedProduct,
  amountInserted,
  onInsert,
  onReturnMoney,
  vending,
  onVend,
}: {
  nameId: string;
  name: string;
  onNameChange: (name: string) => void;
  selectedProduct: Product | null;
  amountInserted: number;
  onInsert: (denomination: Denomination) => void;
  onReturnMoney: () => void;
  vending: boolean;
  onVend: (event: SubmitEvent<HTMLFormElement>) => void;
}) {
  const changePreview = describeChangeDue(selectedProduct?.price ?? null, amountInserted);
  const changeColor =
    changePreview.status === "short" ? "text-screen-short" : changePreview.status === "exact" ? "text-screen-exact" : "";

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={onVend}
    >
      <h2 className={heading}>Pay</h2>
      <div className="lcd grid gap-1 rounded-xl border border-screen-edge bg-screen px-m py-m font-mono text-m text-screen-text tabular-nums" aria-live="off">
        <div className="flex justify-between gap-4">
          <span className="text-screen-dim">Item</span>
          <strong className="text-right font-medium">{selectedProduct ? `${selectedProduct.code}  ${selectedProduct.name}` : "Choose one"}</strong>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-screen-dim">Price</span>
          <strong className="text-right font-medium">{selectedProduct ? formatPence(selectedProduct.price) : "—"}</strong>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-screen-dim">Paying</span>
          <strong className="text-right font-medium">{formatPence(amountInserted)}</strong>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-screen-dim">Change</span>
          <strong className={`text-right font-medium ${changeColor}`}>{changePreview.text}</strong>
        </div>
      </div>

      <label className="grid gap-1.5 text-m" htmlFor={nameId}>
        Your name
        <input
          id={nameId}
          className={`w-full rounded-control border border-line bg-field px-3 py-3 text-base text-foreground placeholder:text-faint ${focusRing}`}
          value={name}
          maxLength={40}
          autoComplete="name"
          placeholder="Ada"
          onChange={(event) => onNameChange(event.target.value)}
        />
      </label>
      <p className="text-s text-muted">
        Each name is limited on its own. Three vends, then a short wait.
      </p>

      <div>
        <p className="text-xs tracking-label text-muted uppercase">Insert</p>
        <div className="mt-s flex flex-wrap gap-s">
          {[...DENOMINATIONS].reverse().map((denomination) => (
            <button
              key={denomination}
              type="button"
              className={`grid size-coin place-items-center rounded-full border-0 font-mono text-xs text-ink ${coinBackground(coinMetal(denomination))} ${pressable}`}
              disabled={vending}
              onClick={() => onInsert(denomination)}
            >
              {coinLabel(denomination)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-card px-3 py-2.5">
          <span className="block text-xs tracking-label text-muted uppercase">Price</span>
          <strong className="font-mono text-l font-medium tabular-nums">
            {selectedProduct ? formatPence(selectedProduct.price) : "—"}
          </strong>
        </div>
        <div className="rounded-xl bg-card px-3 py-2.5">
          <span className="block text-xs tracking-label text-muted uppercase">Paying</span>
          <strong className="font-mono text-l font-medium tabular-nums">{formatPence(amountInserted)}</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[0.85fr_1.15fr]">
        <button
          type="button"
          className={`rounded-full border border-line bg-transparent px-4 py-m text-base text-foreground ${pressable}`}
          disabled={amountInserted === 0 || vending}
          onClick={onReturnMoney}
        >
          Return money
        </button>
        <button
          type="submit"
          className={`rounded-full border-0 bg-action px-4 py-m text-base font-semibold text-ink ${pressable}`}
          disabled={vending}
        >
          {vending ? "Vending…" : "Vend"}
        </button>
      </div>
    </form>
  );
}

function describeChangeDue(price: number | null, amountInserted: number) {
  if (price === null) return { text: "—", status: "idle" as const };
  const changeInPence = amountInserted - price;
  if (changeInPence === 0) return { text: "exact", status: "exact" as const };
  if (changeInPence < 0) return { text: `short ${formatPence(-changeInPence)}`, status: "short" as const };
  return { text: formatPence(changeInPence), status: "due" as const };
}
