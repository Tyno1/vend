import type { ReactNode } from "react";
import { coinLabel, coinMetal, formatPence } from "@/lib/coins";
import type { Drawer, Product, PurchaseResponse, RefusalReason } from "@/lib/types";
import { coinBackground } from "./coin-background";

const cardBackground = {
  idle: "bg-card",
  success: "bg-success motion-safe:animate-arrive",
  exact: "bg-success motion-safe:animate-arrive",
  short: "bg-warning motion-safe:animate-arrive",
  cannot: "bg-warning motion-safe:animate-arrive",
  rate: "bg-limit motion-safe:animate-arrive",
  invalid: "bg-warning motion-safe:animate-arrive",
} as const;

const label = "text-xs tracking-label text-primary uppercase";
const title = "mt-1 font-display text-xl font-medium tracking-tight";
const message = "mt-s text-m";

export function DrawerView({
  drawer,
  updateCount,
  millisecondsLeft,
}: {
  drawer: Drawer;
  updateCount: number;
  millisecondsLeft: number;
}) {
  return (
    <div className="drawer" aria-live="polite" aria-atomic="true">
      {drawer.kind === "empty" ? (
        <DrawerCard background="idle">
          <p className={label}>Drawer</p>
          <p className={title}>Nothing dispensed yet</p>
          <p className={`${message} text-foreground`}>
            Choose an item, insert money, and vend. The drawer shows your coins, or why the machine handed nothing over.
          </p>
        </DrawerCard>
      ) : drawer.kind === "message" ? (
        <DrawerCard background="invalid" updateCount={updateCount}>
          <p className={label}>Hold on</p>
          <p className={title}>{drawer.title}</p>
          <p className={`${message} text-foreground`}>{drawer.message}</p>
        </DrawerCard>
      ) : (
        <ResultCard response={drawer.response} item={drawer.item} updateCount={updateCount} millisecondsLeft={millisecondsLeft} />
      )}
    </div>
  );
}

function DrawerCard({
  background,
  updateCount,
  children,
}: {
  background: keyof typeof cardBackground;
  updateCount?: number;
  children: ReactNode;
}) {
  return (
    <div key={updateCount} className={`rounded-tile px-m pt-m pb-4 ${cardBackground[background]}`}>
      {children}
    </div>
  );
}

function ResultCard({
  response,
  item,
  updateCount,
  millisecondsLeft,
}: {
  response: PurchaseResponse;
  item: Product | undefined;
  updateCount: number;
  millisecondsLeft: number;
}) {
  if (response.ok) {
    const exact = response.changeInPence === 0;
    return (
      <DrawerCard background={exact ? "exact" : "success"} updateCount={updateCount}>
        <p className={label}>{exact ? "Exact amount" : "Your change"}</p>
        <p className={title}>{item?.name ?? "Dispensed"}</p>
        <p className={`${message} text-foreground`}>
          Paid {formatPence(response.amountPaid)} for {formatPence(response.price)}. {response.message}
        </p>
        {response.change.length > 0 ? (
          <div className="change mt-3 flex flex-wrap gap-s">
            {response.change.flatMap((coin) =>
              Array.from({ length: coin.count }, (_, index) => (
                <span
                  key={`${coin.denomination}-${index}`}
                  className={`grid size-coin place-items-center rounded-full font-mono text-xs text-ink ${coinBackground(coinMetal(coin.denomination))}`}
                >
                  {coinLabel(coin.denomination)}
                </span>
              )),
            )}
          </div>
        ) : (
          <p className={`${message} text-muted`}>No coins in the drawer.</p>
        )}
      </DrawerCard>
    );
  }

  const headline = {
    insufficient_payment: "Short",
    cannot_make_change: "Change isn't possible",
    rate_limited: "Limit reached",
    invalid: "Needs a correction",
  }[response.reason];

  return (
    <DrawerCard background={backgroundFor(response.reason)} updateCount={updateCount}>
      <p className={label}>Refused</p>
      <p className={title}>{headline}</p>
      <p className={`${message} text-foreground`}>{response.message}</p>
      {response.reason === "rate_limited" && millisecondsLeft > 0 ? (
        <p className={`${message} text-muted`}>You can try again in {(millisecondsLeft / 1000).toFixed(1)}s.</p>
      ) : null}
    </DrawerCard>
  );
}

function backgroundFor(reason: RefusalReason) {
  switch (reason) {
    case "insufficient_payment":
      return "short" as const;
    case "cannot_make_change":
      return "cannot" as const;
    case "rate_limited":
      return "rate" as const;
    default:
      return "invalid" as const;
  }
}
