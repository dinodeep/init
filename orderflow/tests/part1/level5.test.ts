import { describe, expect, it } from "vitest";
import { InventoryService } from "../../src/inventory/inventory";
import { InMemoryStockStore } from "../../src/inventory/stockStore";

function setup(stock: Record<string, number>) {
  const store = new InMemoryStockStore(stock, 3);
  return { store, inventory: new InventoryService(store) };
}

describe("InventoryService: one call at a time", () => {
  it("reserves stock when enough is available", async () => {
    const { store, inventory } = setup({ "MUG-01": 5 });
    await expect(inventory.reserve("r1", "MUG-01", 2)).resolves.toBe(true);
    expect(store.peek("MUG-01")).toBe(3);
  });

  it("refuses a reservation larger than the available stock", async () => {
    const { store, inventory } = setup({ "MUG-01": 1 });
    await expect(inventory.reserve("r1", "MUG-01", 2)).resolves.toBe(false);
    expect(store.peek("MUG-01")).toBe(1);
  });

  it("treats unknown SKUs as out of stock", async () => {
    const { inventory } = setup({});
    await expect(inventory.reserve("r1", "NOPE", 1)).resolves.toBe(false);
  });

  it("is idempotent when the same reservation is retried", async () => {
    const { store, inventory } = setup({ "MUG-01": 5 });
    await inventory.reserve("r1", "MUG-01", 2);
    await expect(inventory.reserve("r1", "MUG-01", 2)).resolves.toBe(true);
    expect(store.peek("MUG-01")).toBe(3);
  });

  it("puts stock back on release, and only once", async () => {
    const { store, inventory } = setup({ "MUG-01": 5 });
    await inventory.reserve("r1", "MUG-01", 2);
    await inventory.release("r1");
    await inventory.release("r1");
    expect(store.peek("MUG-01")).toBe(5);
    expect(inventory.activeReservationCount()).toBe(0);
  });

  it("ignores releases for unknown reservations", async () => {
    const { store, inventory } = setup({ "MUG-01": 5 });
    await inventory.release("does-not-exist");
    expect(store.peek("MUG-01")).toBe(5);
  });
});

describe("InventoryService: concurrent checkouts", () => {
  it("never oversells when many customers check out at once", async () => {
    const { store, inventory } = setup({ "MUG-01": 5 });

    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) => inventory.reserve(`r${i}`, "MUG-01", 1)),
    );

    expect(results.filter(Boolean)).toHaveLength(5);
    expect(store.peek("MUG-01")).toBe(0);
    expect(inventory.activeReservationCount()).toBe(5);
  });

  it("only holds stock once when the same reservation arrives twice concurrently", async () => {
    const { store, inventory } = setup({ "MUG-01": 5 });

    const results = await Promise.all([
      inventory.reserve("r1", "MUG-01", 2),
      inventory.reserve("r1", "MUG-01", 2), // client retry after a timeout
      inventory.reserve("r2", "MUG-01", 1),
    ]);

    expect(results).toEqual([true, true, true]);
    expect(store.peek("MUG-01")).toBe(2);
    expect(inventory.activeReservationCount()).toBe(2);
  });

  it("only returns stock once when the same release arrives twice concurrently", async () => {
    const { store, inventory } = setup({ "MUG-01": 5 });
    await inventory.reserve("r1", "MUG-01", 2);
    await inventory.reserve("r2", "MUG-01", 1);
    expect(store.peek("MUG-01")).toBe(2);

    await Promise.all([inventory.release("r1"), inventory.release("r1"), inventory.release("r2")]);

    expect(store.peek("MUG-01")).toBe(5);
    expect(inventory.activeReservationCount()).toBe(0);
  });

  it("(stretch) does not make reservations for different SKUs wait on each other", async () => {
    const { store, inventory } = setup({ "MUG-01": 5, "TEA-07": 5 });

    await Promise.all([inventory.reserve("r1", "MUG-01", 1), inventory.reserve("r2", "TEA-07", 1)]);

    // If the two SKUs were handled one after the other, there would only ever be
    // one store request in flight.
    expect(store.maxInFlight).toBeGreaterThanOrEqual(2);
  });
});
