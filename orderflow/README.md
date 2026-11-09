# Orderflow

Orderflow is the order-processing backend for a small online homewares store.
It prices carts, applies coupons, holds warehouse stock during checkout, and
charges customers in a nightly batch.

You've just joined the team. Last night's batch went badly: totals were wrong,
the payment report came back empty, and we sold more mugs than we had. Your job
is to find out why.

## Setup

You need **Node.js 18.18 or newer** (20 or 22 recommended).

```bash
npm install
npm test          # runs every test (many fail at first, which is expected)
npm run demo      # runs a simulated end-of-day batch
```

Useful scripts:

| Command | What it does |
| --- | --- |
| `npm run test:level1` … `npm run test:level5` | Run the tests for one Part 1 level |
| `npm run test:part2` | Run your Part 2 tests |
| `npm run test:watch` | Re-run tests on every save |
| `npm run typecheck` | Type-check the whole project |
| `npm run demo` | Run the end-of-day batch simulation |

## Part 1: Debugging

Each level has a test file in `tests/part1/` that describes how the code
*should* behave. The code in `src/` has bugs. Fix the code so the tests pass.

| Level | Area | Code |
| --- | --- | --- |
| 1 | Cart totals and shipping | `src/cart/cart.ts` |
| 2 | Catalog search and pagination | `src/catalog/search.ts` |
| 3 | Payment batch job | `src/orders/processor.ts` |
| 4 | Coupon pricing rules | `src/pricing/coupons.ts` |
| 5 | Inventory reservations | `src/inventory/inventory.ts` |

The levels get harder as you go. Getting through every level isn't expected.
How you work matters more than how far you get.

Ground rules:

- **Fix the code, not the tests.** If you think a test is wrong, say so and explain why.
- **Don't modify `src/inventory/stockStore.ts`.** It stands in for a third-party client.
- Think out loud. Tell your interviewer what you suspect and how you're checking it.
- You can use the debugger, `console.log`, the Node REPL, and documentation.
  Check with your interviewer before using an AI assistant.

## Part 2: Writing tests

Your interviewer will point you at **one** of these:

- **A. `splitInvoice`** (`src/billing/splitInvoice.ts`) splits an invoice across cost centers.
  Write your tests in `tests/part2/splitInvoice.test.ts`.
- **B. `TokenBucket`** (`src/ratelimit/tokenBucket.ts`) is the rate limiter for payment-gateway calls.
  Write your tests in `tests/part2/tokenBucket.test.ts`.

Users say the function *sometimes* gives wrong results. Nobody has managed to
reproduce it. Write a test suite that:

1. tests the **contract** in the doc comment, not whatever the code currently does, and
2. would pass on a correct implementation but **fails on this one**.

Once you have a failing test, explain the root cause, then fix the code.

## Project layout

```
src/
  types.ts                shared domain types (money is always integer cents)
  cart/cart.ts            subtotal, shipping, money formatting
  catalog/search.ts       product search and pagination
  orders/processor.ts     retry helper and nightly payment batch
  pricing/coupons.ts      coupon rules
  inventory/inventory.ts  stock reservations during checkout
  inventory/stockStore.ts warehouse client (don't modify)
  billing/splitInvoice.ts Part 2A
  ratelimit/tokenBucket.ts Part 2B
  demo.ts                 end-of-day batch simulation
tests/
  part1/level1..5.test.ts
  part2/*.test.ts         starter files for Part 2
```
