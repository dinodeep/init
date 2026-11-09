import type { Product } from "../types";

export interface Page<T> {
  items: T[];
  /** 1-based page number that was requested. */
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/**
 * Returns one page of results. `page` is 1-based: the first page is page 1.
 * Asking for a page past the end returns an empty `items` array.
 */
export function paginate<T>(items: readonly T[], page: number, pageSize: number): Page<T> {
  if (!Number.isInteger(page) || page < 1) {
    throw new RangeError(`page must be a positive integer, got ${page}`);
  }
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new RangeError(`pageSize must be a positive integer, got ${pageSize}`);
  }

  const start = page * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page,
    pageSize,
    totalItems: items.length,
    totalPages: Math.floor(items.length / pageSize),
  };
}

/**
 * Storefront search. A product matches when either:
 *  - its name contains the query (case-insensitive), or
 *  - one of its tags equals the query exactly (case-insensitive).
 * Results are sorted by name, A to Z. A blank query returns every product.
 */
export function searchProducts(products: readonly Product[], query: string): Product[] {
  const q = query.trim().toLowerCase();
  const matches =
    q === "" ? [...products] : products.filter((p) => p.name.includes(q) || p.tags.includes(q));
  return matches.sort((a, b) => a.name.localeCompare(b.name));
}
