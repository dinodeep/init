/**
 * Client for the warehouse stock service.
 *
 * ⚠️  Treat this file as a third-party client: DO NOT MODIFY IT.
 * The real service only supports get/set (no transactions, no atomic
 * increment), and every call is a network round trip that takes a few ms.
 */
export interface StockStore {
  get(sku: string): Promise<number | undefined>;
  set(sku: string, quantity: number): Promise<void>;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** In-memory stand-in for the warehouse service, with simulated network latency. */
export class InMemoryStockStore implements StockStore {
  private readonly data: Map<string, number>;
  private inFlight = 0;
  /** Highest number of requests that were ever in flight at once (for diagnostics). */
  maxInFlight = 0;

  constructor(initial: Record<string, number> = {}, private readonly latencyMs = 2) {
    this.data = new Map(Object.entries(initial));
  }

  get(sku: string): Promise<number | undefined> {
    return this.roundTrip(() => this.data.get(sku));
  }

  set(sku: string, quantity: number): Promise<void> {
    return this.roundTrip(() => {
      this.data.set(sku, quantity);
    });
  }

  /** Synchronous read for tests and reports. Not part of the StockStore interface. */
  peek(sku: string): number | undefined {
    return this.data.get(sku);
  }

  private async roundTrip<T>(op: () => T): Promise<T> {
    this.inFlight++;
    this.maxInFlight = Math.max(this.maxInFlight, this.inFlight);
    try {
      await sleep(this.latencyMs);
      return op();
    } finally {
      this.inFlight--;
    }
  }
}
