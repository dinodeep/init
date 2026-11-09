import { describe, expect, it } from "vitest";
import { paginate, searchProducts } from "../../src/catalog/search";
import type { Product } from "../../src/types";

describe("paginate", () => {
  const letters = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"]; // 10 items

  it("returns the first items for page 1", () => {
    const page = paginate(letters, 1, 3);
    expect(page.items).toEqual(["a", "b", "c"]);
    expect(page.page).toBe(1);
    expect(page.totalItems).toBe(10);
  });

  it("returns the next slice for page 2", () => {
    expect(paginate(letters, 2, 3).items).toEqual(["d", "e", "f"]);
  });

  it("returns a partial last page", () => {
    expect(paginate(letters, 4, 3).items).toEqual(["j"]);
  });

  it("counts a partial last page in totalPages", () => {
    expect(paginate(letters, 1, 3).totalPages).toBe(4);
  });

  it("does not add an extra page when items divide evenly", () => {
    expect(paginate(letters.slice(0, 9), 1, 3).totalPages).toBe(3);
  });

  it("returns an empty page past the end", () => {
    const page = paginate(letters, 5, 3);
    expect(page.items).toEqual([]);
    expect(page.totalPages).toBe(4);
  });

  it("handles an empty list", () => {
    const page = paginate([], 1, 20);
    expect(page.items).toEqual([]);
    expect(page.totalPages).toBe(0);
  });

  it("rejects invalid page numbers and sizes", () => {
    expect(() => paginate(letters, 0, 3)).toThrow(RangeError);
    expect(() => paginate(letters, 1, 0)).toThrow(RangeError);
    expect(() => paginate(letters, 1.5, 3)).toThrow(RangeError);
  });
});

describe("searchProducts", () => {
  const catalog: Product[] = [
    { sku: "MUG-01", name: "Ceramic Mug", priceCents: 1250, tags: ["kitchen", "gift"] },
    { sku: "MUG-02", name: "Travel mug", priceCents: 1899, tags: ["outdoors"] },
    { sku: "TEA-07", name: "Green Tea Tin", priceCents: 899, tags: ["kitchen", "tea"] },
    { sku: "BAG-03", name: "Canvas Tote", priceCents: 2400, tags: ["gift"] },
    { sku: "LMP-11", name: "Desk Lamp", priceCents: 3900, tags: ["office"] },
  ];
  const names = (ps: Product[]) => ps.map((p) => p.name);

  it("returns every product, sorted by name, for a blank query", () => {
    expect(names(searchProducts(catalog, "   "))).toEqual([
      "Canvas Tote",
      "Ceramic Mug",
      "Desk Lamp",
      "Green Tea Tin",
      "Travel mug",
    ]);
  });

  it("matches lower-case name substrings", () => {
    expect(names(searchProducts(catalog, "mug"))).toEqual(["Ceramic Mug", "Travel mug"]);
  });

  it("matches names regardless of the query's or the name's case", () => {
    expect(names(searchProducts(catalog, "MUG"))).toEqual(["Ceramic Mug", "Travel mug"]);
    expect(names(searchProducts(catalog, "desk"))).toEqual(["Desk Lamp"]);
  });

  it("matches tags exactly, ignoring case", () => {
    expect(names(searchProducts(catalog, "Gift"))).toEqual(["Canvas Tote", "Ceramic Mug"]);
  });

  it("does not match partial tags", () => {
    expect(searchProducts(catalog, "offi")).toEqual([]);
  });

  it("does not reorder the caller's catalog", () => {
    const before = names(catalog);
    searchProducts(catalog, "");
    expect(names(catalog)).toEqual(before);
  });
});
