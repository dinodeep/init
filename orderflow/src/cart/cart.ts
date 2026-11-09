import type { CartItem } from "../types";

export const FREE_SHIPPING_THRESHOLD_CENTS = 5_000; // $50.00
export const FLAT_SHIPPING_CENTS = 599; // $5.99

/** Sum of (unit price × quantity) across every line in the cart. */
export function calculateSubtotal(items: readonly CartItem[]): number {
  return items.reduce((sum, item) => sum + item.unitPriceCents, 0);
}

/**
 * Shipping policy:
 *  - Empty carts (subtotal of 0) have no shipping charge.
 *  - Orders of $50.00 or more ship free.
 *  - Everything else pays the flat rate.
 */
export function calculateShipping(subtotalCents: number): number {
  if (subtotalCents === 0) return 0;
  return subtotalCents > FREE_SHIPPING_THRESHOLD_CENTS ? 0 : FLAT_SHIPPING_CENTS;
}

/**
 * Formats cents as US dollars for receipts and emails.
 *   1250    -> "$12.50"
 *   123456  -> "$1,234.56"
 *   -500    -> "-$5.00"   (refunds / credits)
 */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
