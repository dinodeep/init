export interface TokenBucketOptions {
  /** Maximum tokens the bucket can hold. Positive integer. */
  capacity: number;
  /** Tokens added per second. Positive integer. */
  refillPerSecond: number;
  /** Current time in integer milliseconds. Defaults to Date.now. Inject a fake clock in tests. */
  clock?: () => number;
}

/**
 * Token-bucket rate limiter. It keeps our outbound calls under the payment
 * gateway's rate limit (the gateway bans API keys that go over it).
 *
 * Contract:
 *  - The bucket starts full, with `capacity` tokens.
 *  - Tokens are added at `refillPerSecond` per second, up to `capacity`.
 *    Time comes from `clock()`.
 *  - tryRemove(n) checks for at least n tokens. If they are there, it removes
 *    n and returns true. If not, it removes nothing and returns false.
 *  - availableTokens() returns how many whole tokens are available right now.
 *  - Throughput: over any window of W ms, callers can remove at most
 *    capacity + floor(W * refillPerSecond / 1000) tokens in total. A caller
 *    that keeps asking gets exactly that many.
 *  - Throws RangeError if capacity, refillPerSecond, or n is not a positive integer.
 */
export class TokenBucket {
  private readonly capacity: number;
  private readonly refillPerSecond: number;
  private readonly clock: () => number;
  private tokens: number;
  private lastRefillMs: number;

  constructor({ capacity, refillPerSecond, clock = Date.now }: TokenBucketOptions) {
    assertPositiveInteger("capacity", capacity);
    assertPositiveInteger("refillPerSecond", refillPerSecond);
    this.capacity = capacity;
    this.refillPerSecond = refillPerSecond;
    this.clock = clock;
    this.tokens = capacity;
    this.lastRefillMs = clock();
  }

  tryRemove(n = 1): boolean {
    assertPositiveInteger("n", n);
    this.refill();
    if (this.tokens >= n) {
      this.tokens -= n;
      return true;
    }
    return false;
  }

  availableTokens(): number {
    this.refill();
    return this.tokens;
  }

  private refill(): void {
    const now = this.clock();
    const elapsedMs = now - this.lastRefillMs;
    if (elapsedMs <= 0) return;

    const refilled = Math.floor((elapsedMs * this.refillPerSecond) / 1000);
    this.tokens = Math.min(this.capacity, this.tokens + refilled);
    this.lastRefillMs = now;
  }
}

function assertPositiveInteger(name: string, value: number): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive integer, got ${value}`);
  }
}
