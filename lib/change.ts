import { DENOMINATIONS, totalPence } from "./coins";
import type { ChangeCoin, CoinCounts, FewestSoFar, MakeChangeReturnType } from "./types";

export function makeChange(amountInPence: number, coinsForChange: CoinCounts): MakeChangeReturnType {
  if (!Number.isSafeInteger(amountInPence) || amountInPence < 0) return null;
  if (amountInPence === 0) return [];

  for (const denomination of DENOMINATIONS) {
    const count = coinsForChange[denomination];
    if (!Number.isSafeInteger(count) || count < 0) return null;
  }

  const availablePence = totalPence(coinsForChange);
  if (amountInPence > availablePence) return null;

  const fewestByAmount: Array<FewestSoFar | undefined> = new Array(amountInPence + 1);
  fewestByAmount[0] = { numberOfCoins: 0, countOfEach: DENOMINATIONS.map(() => 0) };

  DENOMINATIONS.forEach((denomination, index) => {
    const available = Math.min(
      coinsForChange[denomination],
      Math.floor(amountInPence / denomination),
    );
    for (let copiesPlaced = 0; copiesPlaced < available; copiesPlaced += 1) {
      for (let amountSoFar = amountInPence; amountSoFar >= denomination; amountSoFar -= 1) {
        const withoutThisCoin = fewestByAmount[amountSoFar - denomination];
        if (!withoutThisCoin) continue;
        const numberOfCoins = withoutThisCoin.numberOfCoins + 1;
        const current = fewestByAmount[amountSoFar];
        if (current && current.numberOfCoins <= numberOfCoins) continue;
        const countOfEach = withoutThisCoin.countOfEach.slice();
        countOfEach[index] = (countOfEach[index] ?? 0) + 1;
        fewestByAmount[amountSoFar] = { numberOfCoins, countOfEach };
      }
    }
  });

  const bestWay = fewestByAmount[amountInPence];
  if (!bestWay) return null;

  const change: ChangeCoin[] = [];
  DENOMINATIONS.forEach((denomination, index) => {
    const count = bestWay.countOfEach[index] ?? 0;
    if (count > 0) change.push({ denomination, count });
  });
  return change;
}
