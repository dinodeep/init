export type Coupon =
  | { code: string; kind: "percent"; percentOff: number }
  | { code: string; kind: "fixed"; amountOffCents: number };

export interface DiscountResult {
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  /** Codes that were applied, as the customer entered them, in the order they were applied. */
  applied: string[];
}

/**
 * Applies the customer's coupons to a cart subtotal.
 *
 * Pricing rules (signed off by Finance):
 *  1. All percentage coupons apply before any fixed-amount coupon. Within each
 *     kind, coupons apply in the order the customer entered them.
 *  2. Percentage coupons compound on the running total. Each one takes off
 *     round(runningTotal * percentOff / 100) cents, rounding half up.
 *  3. Fixed-amount coupons subtract from the running total. The total never
 *     goes below $0.00.
 *  4. Codes are case-insensitive. A code entered more than once only counts
 *     once; the first occurrence wins.
 *  5. Inputs must not be mutated. The checkout page re-renders the coupon list
 *     exactly as the customer typed it.
 */
export function applyCoupons(subtotalCents: number, coupons: Coupon[]): DiscountResult {
  const ordered = coupons.sort((a) => (a.kind === "percent" ? -1 : 1));

  const seen = new Set<string>();
  const applied: string[] = [];
  let running = subtotalCents;

  for (const coupon of ordered) {
    if (seen.has(coupon.code)) continue;
    seen.add(coupon.code);

    if (coupon.kind === "percent") {
      running = Math.floor(running * (1 - coupon.percentOff / 100));
    } else {
      running -= coupon.amountOffCents;
    }
    applied.push(coupon.code);
  }

  return {
    subtotalCents,
    discountCents: subtotalCents - running,
    totalCents: running,
    applied,
  };
}
