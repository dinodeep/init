import { describe, expect, it } from "vitest";
import { TokenBucket } from "../../src/ratelimit/tokenBucket";

// Part 2: write a test suite for TokenBucket (src/ratelimit/tokenBucket.ts).
// The contract is in the doc comment on the class. Test against the contract,
// not against whatever the current code happens to return.

/** A clock you control by hand. */
function fakeClock(startMs = 0) {
  let now = startMs;
  return {
    now: () => now,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

describe("TokenBucket", () => {
  it("starts full", () => {
    const clock = fakeClock();
    const bucket = new TokenBucket({ capacity: 3, refillPerSecond: 1, clock: clock.now });
    expect(bucket.availableTokens()).toBe(3);
  });

  // TODO: add your tests here.
});
