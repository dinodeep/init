import { describe, expect, it } from "vitest";
import {
  FLAT_SHIPPING_CENTS,
  calculateShipping,
  calculateSubtotal,
  formatCents,
} from "../../src/cart/cart";
import type { CartItem } from "../../src/types";

const mug: CartItem = { sku: "MUG-01", name: "Ceramic Mug", unitPriceCents: 1250, quantity: 2 };
const tea: CartItem = { sku: "TEA-07", name: "Green Tea Tin", unitPriceCents: 899, quantity: 3 };

describe("calculateSubtotal", () => {
  it("is 0 for an empty cart", () => {
    expect(calculateSubtotal([])).toBe(0);
  });

  it("handles a single item with quantity 1", () => {
    expect(calculateSubtotal([{ ...mug, quantity: 1 }])).toBe(1250);
  });

  it("accounts for the quantity of every line", () => {
    // 2 × $12.50 + 3 × $8.99 = $51.97
    expect(calculateSubtotal([mug, tea])).toBe(5197);
  });
});

describe("calculateShipping", () => {
  it("charges nothing for an empty cart", () => {
    expect(calculateShipping(0)).toBe(0);
  });

  it("charges the flat rate below $50.00", () => {
    expect(calculateShipping(4999)).toBe(FLAT_SHIPPING_CENTS);
  });

  it("ships free at exactly $50.00", () => {
    expect(calculateShipping(5000)).toBe(0);
  });

  it("ships free above $50.00", () => {
    expect(calculateShipping(7500)).toBe(0);
  });
});

describe("formatCents", () => {
  it.each([
    [0, "$0.00"],
    [5, "$0.05"],
    [1250, "$12.50"],
    [99_999, "$999.99"],
  ])("formats %i as %s", (cents, expected) => {
    expect(formatCents(cents)).toBe(expected);
  });

  it("adds thousands separators", () => {
    expect(formatCents(123_456)).toBe("$1,234.56");
    expect(formatCents(100_000_000)).toBe("$1,000,000.00");
  });

  it("puts the minus sign before the dollar sign for credits", () => {
    expect(formatCents(-500)).toBe("-$5.00");
    expect(formatCents(-123_456)).toBe("-$1,234.56");
  });
});
