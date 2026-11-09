/**
 * Splits an invoice total across cost centers in proportion to their weights
 * (for example, seat counts per team), in whole cents.
 *
 * Contract:
 *  - Returns one amount per weight, in the same order as `weights`.
 *  - Amounts are non-negative integers that add up to exactly `totalCents`.
 *  - Each amount is either the floor or the ceiling of its exact proportional
 *    share, totalCents * weight / sum(weights).
 *  - After every share is rounded down, the leftover cents go one at a time to
 *    the entries with the largest fractional remainder ("largest remainder
 *    method"). When remainders tie, the earlier entry wins. That keeps the
 *    output deterministic, and by convention the first cost center listed is
 *    the primary account, which absorbs rounding first.
 *  - A zero weight is allowed and always gets 0.
 *  - Throws RangeError if `totalCents` is not a non-negative safe integer, if
 *    `weights` is empty, if any weight is negative or not an integer, or if
 *    every weight is zero.
 */
export function splitInvoice(totalCents: number, weights: readonly number[]): number[] {
  if (!Number.isSafeInteger(totalCents) || totalCents < 0) {
    throw new RangeError(`totalCents must be a non-negative integer, got ${totalCents}`);
  }
  if (weights.length === 0) {
    throw new RangeError("at least one weight is required");
  }
  for (const w of weights) {
    if (!Number.isSafeInteger(w) || w < 0) {
      throw new RangeError(`weights must be non-negative integers, got ${w}`);
    }
  }
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight === 0) {
    throw new RangeError("at least one weight must be positive");
  }

  // Stay in integer arithmetic. Each exact share is
  //   totalCents * w / totalWeight  ==  amount + remainder / totalWeight
  const shares = weights.map((weight, index) => {
    const scaled = totalCents * weight;
    const remainder = scaled % totalWeight;
    return { index, amount: (scaled - remainder) / totalWeight, remainder };
  });

  let leftover = totalCents - shares.reduce((sum, s) => sum + s.amount, 0);

  // Hand out the leftover cents one at a time, largest remainder first.
  const byRemainder = [...shares].sort(
    (a, b) => b.remainder - a.remainder || b.index - a.index,
  );
  for (const share of byRemainder) {
    if (leftover === 0) break;
    share.amount += 1;
    leftover -= 1;
  }

  return shares.map((s) => s.amount);
}
