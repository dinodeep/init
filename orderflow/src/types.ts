// Shared domain types. All money values are integer cents (e.g. $12.50 === 1250).

/** One line in a shopping cart. */
export interface CartItem {
  sku: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
}

/** A product in the storefront catalog. */
export interface Product {
  sku: string;
  name: string;
  priceCents: number;
  /** Lower-case tags, e.g. ["kitchen", "gift"]. */
  tags: string[];
}

/** A checked-out order, ready to be charged. */
export interface Order {
  id: string;
  customerId: string;
  items: CartItem[];
  totalCents: number;
}
