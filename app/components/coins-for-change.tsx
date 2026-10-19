import { DENOMINATIONS, coinLabel, coinMetal, formatPence, totalPence } from "@/lib/coins";
import type { CoinCounts, Denomination } from "@/lib/types";
import { coinBackground } from "./coin-background";

const heading = "text-xs font-semibold tracking-label text-muted uppercase";

export function CoinsForChange({
  coinsForChange,
  coinsUnavailable,
}: {
  coinsForChange: CoinCounts | null;
  coinsUnavailable: boolean;
}) {
  return (
    <section
      className="mt-m rounded-card border border-white/8 bg-card px-m pt-m pb-4"
      aria-label="Coins for change"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 className={heading}>Coins for change</h2>
        <p className="font-mono tabular-nums">
          {coinsForChange
            ? `${formatPence(totalPence(coinsForChange))} left`
            : coinsUnavailable
              ? "Unread"
              : "Reading…"}
        </p>
      </div>
      <div className="mt-3 mb-3 grid grid-cols-4 gap-2 sm:grid-cols-8">
        {DENOMINATIONS.map((denomination) => (
          <CoinCount
            key={denomination}
            denomination={denomination}
            count={coinsForChange ? coinsForChange[denomination] : null}
          />
        ))}
      </div>
      <p className="text-s text-muted">
        A successful payment is kept separately. These coins are only used for change, and they only run down.
      </p>
    </section>
  );
}

export function CoinCount({ denomination, count }: { denomination: Denomination; count: number | null }) {
  const empty = count === 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-1 text-s">
        <span className={`inline-flex items-center gap-1 ${empty ? "text-faint" : "text-muted"}`}>
          <span
            className={`size-3 rounded-full ${coinBackground(coinMetal(denomination))}`}
            aria-hidden="true"
          />
          {coinLabel(denomination)}
        </span>
        <strong className={`font-mono tabular-nums ${empty ? "text-faint" : ""}`}>{count === null ? "–" : count}</strong>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line" aria-hidden="true">
        <span className="block h-full bg-primary" style={{ width: `${(count ?? 0) * 10}%` }} />
      </div>
    </div>
  );
}
