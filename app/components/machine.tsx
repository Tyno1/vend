"use client";

import { useEffect, useId, useRef, useState, type SubmitEvent } from "react";
import type { CoinCounts, Denomination, Drawer, GetMachineStateReturnType, Product, PurchaseResponse } from "@/lib/types";
import { CoinsForChange } from "./coins-for-change";
import { DrawerView } from "./drawer";
import { Header } from "./header";
import { PayPanel } from "./pay-panel";
import { ItemsForSale } from "./items-for-sale";

function currentTime() {
  return Date.now();
}

function isPurchaseResponse(value: unknown): value is PurchaseResponse {
  if (typeof value !== "object" || value === null) return false;
  if (!("ok" in value) || !("message" in value)) return false;
  return typeof value.ok === "boolean" && typeof value.message === "string";
}

export function Machine() {
  const nameId = useId();
  const [name, setName] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [amountInserted, setAmountInserted] = useState(0);
  const [coinsForChange, setCoinsForChange] = useState<CoinCounts | null>(null);
  const [coinsUnavailable, setCoinsUnavailable] = useState(false);
  const vendingNow = useRef(false);
  const [vending, setVendingState] = useState(false);

  function setVending(next: boolean) {
    vendingNow.current = next;
    setVendingState(next);
  }
  const [drawer, setDrawer] = useState<Drawer>({ kind: "empty" });
  const [drawerUpdateCount, setDrawerUpdateCount] = useState(0);
  const [limitedUntil, setLimitedUntil] = useState<{ nameInLowerCase: string; until: number } | null>(
    null,
  );
  const [now, setNow] = useState(0);

  const nameInLowerCase = name.trim().toLowerCase();
  const millisecondsLeft =
    limitedUntil && limitedUntil.nameInLowerCase === nameInLowerCase
      ? Math.max(0, limitedUntil.until - now)
      : 0;
  const countingDown = millisecondsLeft > 0;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/machine", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: GetMachineStateReturnType) => {
        if (!cancelled && data.coinsForChange) setCoinsForChange(data.coinsForChange);
      })
      .catch(() => {
        if (!cancelled) setCoinsUnavailable(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!countingDown) return;
    const id = window.setInterval(() => setNow(currentTime()), 100);
    return () => window.clearInterval(id);
  }, [countingDown]);

  function updateDrawer(next: Drawer) {
    setDrawer(next);
    setDrawerUpdateCount((count) => count + 1);
  }

  function insert(denomination: Denomination) {
    if (vendingNow.current) return;
    setAmountInserted((current) => current + denomination);
  }

  async function onVend(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (vendingNow.current) return;
    if (!selectedProduct) {
      updateDrawer({
        kind: "message",
        title: "Choose an item",
        message: "Pick something from the glass, then pay.",
      });
      return;
    }

    setVending(true);
    try {
      const response = await fetch("/api/purchase", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: name.trim(),
          price: selectedProduct.price,
          amountPaid: amountInserted,
        }),
      });
      const data: unknown = await response.json();
      if (!isPurchaseResponse(data)) {
        updateDrawer({
          kind: "message",
          title: "No answer",
          message: "The machine didn't answer. Try the vend again.",
        });
        return;
      }
      if (data.coinsForChange) setCoinsForChange(data.coinsForChange);
      updateDrawer({ kind: "result", response: data, item: selectedProduct });
      if (data.ok) setAmountInserted(0);
      if (!data.ok && data.reason === "rate_limited" && data.retryAfterMs) {
        const seenAt = currentTime();
        setLimitedUntil({ nameInLowerCase, until: seenAt + data.retryAfterMs });
        setNow(seenAt);
      }
    } catch {
      updateDrawer({
        kind: "message",
        title: "No answer",
        message: "The machine didn't answer. Try the vend again.",
      });
    } finally {
      setVending(false);
    }
  }

  return (
    <div className="min-h-full flex-1 bg-base px-3 pt-4 pb-8 sm:px-5 sm:pt-8 sm:pb-12">
      <main className="mx-auto w-full max-w-machine rounded-shell border border-edge bg-base p-l">
        <Header />
        <div className="grid grid-cols-1 gap-m desk:grid-cols-[minmax(0,1.45fr)_minmax(17.5rem,0.9fr)]">
          <ItemsForSale selectedProduct={selectedProduct} onSelect={setSelectedProduct} />
          <div className="flex flex-col gap-3 rounded-card border border-white/8 bg-card p-m">
            <PayPanel
              nameId={nameId}
              name={name}
              onNameChange={setName}
              selectedProduct={selectedProduct}
              amountInserted={amountInserted}
              onInsert={insert}
              onReturnMoney={() => {
                if (vendingNow.current) return;
                setAmountInserted(0);
              }}
              vending={vending}
              onVend={onVend}
            />
            <DrawerView drawer={drawer} updateCount={drawerUpdateCount} millisecondsLeft={millisecondsLeft} />
          </div>
        </div>
        <CoinsForChange coinsForChange={coinsForChange} coinsUnavailable={coinsUnavailable} />
      </main>
    </div>
  );
}
