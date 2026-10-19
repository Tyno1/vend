# Vend

A vending machine. A customer picks an item, puts money in, and the machine either dispenses it with the fewest coins of change it can, or hands the money back.

## Run it

Requires Node.js 20.9 or later (tested on Node 22).

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm test           # all tests
npm run lint
npm run typecheck  # generates Next.js route types, then runs tsc
npm run build
npm start
```

The tests cover four layers:

- `lib/__tests__/change.test.ts` checks the change algorithm. It includes a case where taking the biggest coin first fails. It also compares the result against a brute-force search on 3,000 random coin supplies.
- `lib/__tests__/machine.test.ts` checks the sale rules: the starting coins, that payments are kept out of the change supply, exact payment, refusals leaving the supply untouched, and the rate limit, including its edges.
- `app/api/purchase/route.test.ts` checks the HTTP layer, including malformed JSON.
- `app/components/__tests__/machine.test.tsx` runs the screen. The tests insert coins, press Vend, and check the drawer.

The running server keeps one machine. Restarting it starts again with ten of each coin. Money a customer pays is not added to that supply.

## The screen

The glass is the price list. The customer types a name, inserts UK coins, and presses Vend. Return money gives back what they have inserted and does not call the machine.

The drawer shows the coins handed back, or why the machine handed nothing over. The coins kept for change are listed underneath. They only run down.

## How a sale works

The machine starts with ten of each UK coin: 1p, 2p, 5p, 10p, 20p, 50p, £1, and £2.

The customer sends their name, the price in pence, and the amount paid in pence. On a successful sale the payment is kept separately. Change, when there is any, is taken only from the coins the machine holds for change, in as few coins as possible. An exact payment returns no coins. Those coins only decrease.

A sale is refused, and the coins for change are left untouched, when:

- the payment is short of the price
- the coins still held for change cannot make the amount

Each name may make three purchase attempts in any three-second window. The fourth is refused immediately, before the price is checked and before change is calculated. A refused attempt of that kind does not itself use up a slot. A blank name is refused and does not count. Names are independent of each other. Spacing and letter case do not make a new person. A name is at most 40 characters.

The glass is a price list. The purchase API takes the price directly, so any whole-pence price of at least 1p is a valid sale.

## Code

The screen lives in `app/components`. The sale rules live in `lib`. `GET /api/machine` and `POST /api/purchase` both call that one machine.

## API

`GET /api/machine`

```json
{ "coinsForChange": { "200": 10, "100": 10, "50": 10, "20": 10, "10": 10, "5": 10, "2": 10, "1": 10 }, "totalPence": 3880 }
```

`POST /api/purchase`

```bash
curl -s -X POST http://localhost:3000/api/purchase \
  -H 'content-type: application/json' \
  -d '{"customer":"Ada","price":60,"amountPaid":100}'
```

| Status | Meaning |
| --- | --- |
| 200 | Dispensed. `change` lists the coins. An exact payment has an empty list. |
| 400 | The name or the amounts could not be used. |
| 422 | Payment was short, or the coins kept for change cannot make it. |
| 429 | That name has already made three attempts in the last three seconds. |

Amounts are integer pence. `price` is at least 1. `amountPaid` is at least 0. A body that is not valid JSON is refused with 400.

## Decisions and trade-offs

**Fewest coins, not greedy.** Taking the largest coin first is optimal for a full set of UK coins. Once some denominations run out, it can fail when an answer exists. For example, 60p from one 50p and three 20p coins: greedy takes the 50p and gets stuck. `makeChange` uses a bounded dynamic-programming search instead. It always finds the fewest coins the machine actually holds. The amount is capped by the coins available (£38.80 at most), so the search stays small.

**Coins are deducted only after change is found.** The machine works out the change first and only then takes coins from the supply. A refusal therefore cannot leave the supply half-changed.

**What counts towards the limit.** Every purchase attempt with a name counts, including ones refused for short payment or impossible change. A customer could otherwise hammer the machine with refused requests at no cost. An attempt refused by the limit itself does not count, so waiting always works. A blank name is refused before the limit and is not counted. The window slides: the fourth attempt within 3,000ms of the first is refused.

**State lives in memory.** One `Machine` lives in the server process. That fits a single machine that is never refilled. It also means the coins reset when the server restarts, and the machine would not be shared across serverless instances. A real deployment would keep the coin supply and the rate-limit log in a shared store (for example a database row updated in a transaction, and Redis for the limit). The rate-limit log also keeps one entry per name, which is fine here but would need clearing out at scale.

**The client sends the price.** The brief says the customer provides the price, so the API takes it as given. In a real machine the server would look the price up by item code instead.

## Use of AI

I used an AI assistant while building this, and to review the finished project before submitting.
- The AI agent was involved in inspecting and improving the change making algorithm
- Generating SVG images for product list
- inspecting  and reviewing unit test and general presentation of the app.# vend
