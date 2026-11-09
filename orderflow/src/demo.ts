// End-of-day batch: search the catalog, price carts, hold stock, and charge customers.
// Run with `npm run demo`. Until the Part 1 bugs are fixed, some of these numbers will be wrong.

import { calculateShipping, calculateSubtotal, formatCents } from "./cart/cart";
import { paginate, searchProducts } from "./catalog/search";
import { InventoryService } from "./inventory/inventory";
import { InMemoryStockStore } from "./inventory/stockStore";
import {
  PaymentDeclinedError,
  TransientPaymentError,
  processOrders,
  type PaymentGateway,
} from "./orders/processor";
import { applyCoupons, type Coupon } from "./pricing/coupons";
import type { CartItem, Order, Product } from "./types";

const catalog: Product[] = [
  { sku: "MUG-01", name: "Ceramic Mug", priceCents: 1250, tags: ["kitchen", "gift"] },
  { sku: "MUG-02", name: "Travel mug", priceCents: 1899, tags: ["outdoors"] },
  { sku: "TEA-07", name: "Green Tea Tin", priceCents: 899, tags: ["kitchen", "tea"] },
  { sku: "BAG-03", name: "Canvas Tote", priceCents: 2400, tags: ["gift"] },
];

const line = (sku: string, quantity: number): CartItem => {
  const p = catalog.find((c) => c.sku === sku)!;
  return { sku, name: p.name, unitPriceCents: p.priceCents, quantity };
};

const carts: Array<{ id: string; customerId: string; items: CartItem[]; coupons: Coupon[] }> = [
  { id: "ord_1001", customerId: "ana", items: [line("MUG-01", 2), line("TEA-07", 3)], coupons: [] },
  {
    id: "ord_1002",
    customerId: "ben",
    items: [line("BAG-03", 2), line("MUG-02", 1)],
    coupons: [{ code: "FIVEOFF", kind: "fixed", amountOffCents: 500 }, { code: "SPRING10", kind: "percent", percentOff: 10 }],
  },
  { id: "ord_1003", customerId: "cho", items: [line("MUG-01", 2)], coupons: [] },
  { id: "ord_1004", customerId: "dev", items: [line("MUG-01", 1), line("TEA-07", 1)], coupons: [] },
];

/** Fake gateway: ord_1003 times out once, then succeeds. ord_1004's card is declined. */
const flakyOnce = new Set(["ord_1003"]);
const gateway: PaymentGateway = {
  async charge(orderId) {
    await new Promise((r) => setTimeout(r, 5));
    if (flakyOnce.delete(orderId)) throw new TransientPaymentError("gateway timeout");
    if (orderId === "ord_1004") throw new PaymentDeclinedError("card declined");
    return { transactionId: `txn_${orderId}` };
  },
};

async function main() {
  console.log("Orderflow: end-of-day batch\n");

  const results = searchProducts(catalog, "MUG");
  const page = paginate(results, 1, 10);
  console.log(
    `Search "MUG": ${page.totalItems} result(s), page ${page.page} of ${page.totalPages}:`,
    page.items.map((p) => p.name).join(", ") || "(none)",
  );

  // 4 mugs in stock, but these carts want 5 between them.
  const stock = new InMemoryStockStore({ "MUG-01": 4, "MUG-02": 10, "TEA-07": 10, "BAG-03": 10 });
  const inventory = new InventoryService(stock);

  const priced = await Promise.all(
    carts.map(async (cart) => {
      const held: string[] = [];
      for (const item of cart.items) {
        const id = `${cart.id}:${item.sku}`;
        if (await inventory.reserve(id, item.sku, item.quantity)) held.push(id);
        else {
          await Promise.all(held.map((h) => inventory.release(h)));
          return { cart, order: null as Order | null, note: `out of stock: ${item.sku}` };
        }
      }
      const subtotal = calculateSubtotal(cart.items);
      const { totalCents } = applyCoupons(subtotal, cart.coupons);
      const shipping = calculateShipping(subtotal);
      const order: Order = { id: cart.id, customerId: cart.customerId, items: cart.items, totalCents: totalCents + shipping };
      return { cart, order, note: `subtotal ${formatCents(subtotal)}, shipping ${formatCents(shipping)}` };
    }),
  );

  console.log("\nCheckout:");
  for (const { cart, order, note } of priced) {
    console.log(`  ${cart.id}  ${order ? formatCents(order.totalCents).padStart(9) : "        -"}  (${note})`);
  }

  const orders = priced.flatMap((p) => (p.order ? [p.order] : []));
  const report = await processOrders(orders, gateway);

  console.log("\nPayments:");
  console.log(`  charged: ${report.charged.map((c) => c.orderId).join(", ") || "(none)"}`);
  console.log(`  failed:  ${report.failed.map((f) => `${f.orderId} (${f.reason})`).join(", ") || "(none)"}`);
  console.log(`\nMugs left in the warehouse: ${stock.peek("MUG-01")}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
