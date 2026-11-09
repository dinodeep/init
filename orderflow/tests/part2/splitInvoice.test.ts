import { describe, expect, it } from "vitest";
import { splitInvoice } from "../../src/billing/splitInvoice";

// Part 2: write a test suite for splitInvoice (src/billing/splitInvoice.ts).
// The contract is in the doc comment on the function. Test against the
// contract, not against whatever the current code happens to return.

describe("splitInvoice", () => {
  it("splits evenly when the total divides cleanly", () => {
    expect(splitInvoice(10_000, [1, 1, 2])).toEqual([2_500, 2_500, 5_000]);
  });

  // TODO: add your tests here.
});
