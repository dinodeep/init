import { describe, expect, it } from "vitest";
import { applyCoupons, type Coupon } from "../../src/pricing/coupons";

const pct = (code: string, percentOff: number): Coupon => ({ code, kind: "percent", percentOff });
const fixed = (code: string, amountOffCents: number): Coupon => ({
  code,
  kind: "fixed",
  amountOffCents,
});

describe("applyCoupons", () => {
  it("leaves the total alone when there are no coupons", () => {
    expect(applyCoupons(4200, [])).toEqual({
      subtotalCents: 4200,
      discountCents: 0,
      totalCents: 4200,
      applied: [],
    });
  });

  it("applies a simple percentage coupon", () => {
    const result = applyCoupons(10_000, [pct("SAVE10", 10)]);
    expect(result.totalCents).toBe(9_000);
    expect(result.discountCents).toBe(1_000);
  });

  it("rounds a percentage discount to the nearest cent", () => {
    // 10% of $10.01 is 100.1¢, which rounds to 100¢ off.
    expect(applyCoupons(1_001, [pct("SAVE10", 10)]).totalCents).toBe(901);
    // 7% of $30.00 is exactly 210¢ off.
    expect(applyCoupons(3_000, [pct("SAVE7", 7)]).totalCents).toBe(2_790);
    // 15% of $19.99 is 299.85¢, which rounds to 300¢ off.
    expect(applyCoupons(1_999, [pct("SAVE15", 15)]).totalCents).toBe(1_699);
    // 10% of $10.05 is 100.5¢. The *discount* rounds half up to 101¢ off.
    expect(applyCoupons(1_005, [pct("SAVE10", 10)]).totalCents).toBe(904);
  });

  it("compounds percentage coupons on the running total", () => {
    // $100 -10% = $90, then -20% = $72
    const result = applyCoupons(10_000, [pct("A", 10), pct("B", 20)]);
    expect(result.totalCents).toBe(7_200);
    expect(result.applied).toEqual(["A", "B"]);
  });

  it("applies percentage coupons before fixed coupons", () => {
    // percent first: $100 -10% = $90, then -$10 = $80 (fixed first would give $81)
    const result = applyCoupons(10_000, [fixed("TENOFF", 1_000), pct("SAVE10", 10)]);
    expect(result.totalCents).toBe(8_000);
    expect(result.applied).toEqual(["SAVE10", "TENOFF"]);
  });

  it("keeps the customer's order within each kind of coupon", () => {
    const coupons = [pct("P1", 10), fixed("F1", 100), pct("P2", 5), fixed("F2", 200), pct("P3", 1)];
    expect(applyCoupons(10_000, coupons).applied).toEqual(["P1", "P2", "P3", "F1", "F2"]);
  });

  it("never takes the total below zero", () => {
    const result = applyCoupons(500, [fixed("BIGCREDIT", 2_000)]);
    expect(result.totalCents).toBe(0);
    expect(result.discountCents).toBe(500);
  });

  it("treats codes as case-insensitive and applies each only once", () => {
    const result = applyCoupons(10_000, [pct("WELCOME", 10), pct("welcome", 10)]);
    expect(result.totalCents).toBe(9_000);
    expect(result.applied).toEqual(["WELCOME"]);
  });

  it("does not modify the caller's coupon list", () => {
    const coupons = [fixed("TENOFF", 1_000), pct("SAVE10", 10)];
    const snapshot = structuredClone(coupons);
    applyCoupons(10_000, coupons);
    expect(coupons).toEqual(snapshot);
  });
});
