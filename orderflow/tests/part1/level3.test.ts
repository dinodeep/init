import { describe, expect, it, vi } from "vitest";
import {
  PaymentDeclinedError,
  TransientPaymentError,
  processOrders,
  withRetry,
  type PaymentGateway,
} from "../../src/orders/processor";
import type { Order } from "../../src/types";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type Outcome = "ok" | "transient" | "decline";

/** Fake gateway. Each order id gets a scripted list of outcomes; once a script runs out, calls succeed. */
class FakeGateway implements PaymentGateway {
  readonly calls: string[] = [];

  constructor(
    private readonly script: Record<string, Outcome[]> = {},
    private readonly latencyMs: Record<string, number> = {},
  ) {}

  async charge(orderId: string, _amountCents: number) {
    this.calls.push(orderId);
    await sleep(this.latencyMs[orderId] ?? 1);
    const outcome = this.script[orderId]?.shift() ?? "ok";
    if (outcome === "transient") throw new TransientPaymentError("gateway timeout");
    if (outcome === "decline") throw new PaymentDeclinedError("card declined");
    return { transactionId: `txn_${orderId}` };
  }
}

const order = (id: string, totalCents = 1000): Order => ({
  id,
  customerId: `cust_${id}`,
  items: [],
  totalCents,
});

describe("withRetry", () => {
  it("returns the result of a successful first attempt", async () => {
    const fn = vi.fn(async () => "done");
    await expect(withRetry(fn, { attempts: 3 })).resolves.toBe("done");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries transient failures until one succeeds", async () => {
    const fn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new TransientPaymentError("timeout"))
      .mockRejectedValueOnce(new TransientPaymentError("timeout"))
      .mockResolvedValueOnce("done");

    await expect(withRetry(fn, { attempts: 3 })).resolves.toBe("done");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("gives up after `attempts` calls and throws the last error", async () => {
    let n = 0;
    const fn = vi.fn(async () => {
      n++;
      throw new TransientPaymentError(`timeout #${n}`);
    });

    await expect(withRetry(fn, { attempts: 3 })).rejects.toThrow("timeout #3");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("does not retry errors that are not retryable", async () => {
    const fn = vi.fn(async () => {
      throw new PaymentDeclinedError("card declined");
    });

    await expect(withRetry(fn, { attempts: 5 })).rejects.toThrow("card declined");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("processOrders", () => {
  it("charges every order", async () => {
    const gateway = new FakeGateway();
    const report = await processOrders([order("o1"), order("o2"), order("o3")], gateway);

    expect(report.charged).toEqual([
      { orderId: "o1", transactionId: "txn_o1" },
      { orderId: "o2", transactionId: "txn_o2" },
      { orderId: "o3", transactionId: "txn_o3" },
    ]);
    expect(report.failed).toEqual([]);
  });

  it("records declined orders as failed without stopping the batch", async () => {
    const gateway = new FakeGateway({ o2: ["decline"] });
    const report = await processOrders([order("o1"), order("o2"), order("o3")], gateway);

    expect(report.charged.map((c) => c.orderId)).toEqual(["o1", "o3"]);
    expect(report.failed).toEqual([{ orderId: "o2", reason: "card declined" }]);
  });

  it("retries transient gateway errors", async () => {
    const gateway = new FakeGateway({ o1: ["transient", "transient"] });
    const report = await processOrders([order("o1")], gateway, { attempts: 3 });

    expect(report.charged.map((c) => c.orderId)).toEqual(["o1"]);
    expect(gateway.calls).toEqual(["o1", "o1", "o1"]);
  });

  it("fails an order once it runs out of attempts", async () => {
    const gateway = new FakeGateway({ o1: ["transient", "transient", "transient"] });
    const report = await processOrders([order("o1")], gateway, { attempts: 2 });

    expect(report.failed).toEqual([{ orderId: "o1", reason: "gateway timeout" }]);
    expect(gateway.calls).toHaveLength(2);
  });

  it("lists results in input order even when the gateway answers out of order", async () => {
    const gateway = new FakeGateway(
      { o2: ["decline"], o4: ["decline"] },
      { o1: 30, o2: 25, o3: 1, o4: 5 },
    );
    const report = await processOrders(
      [order("o1"), order("o2"), order("o3"), order("o4")],
      gateway,
    );

    expect(report.charged.map((c) => c.orderId)).toEqual(["o1", "o3"]);
    expect(report.failed.map((f) => f.orderId)).toEqual(["o2", "o4"]);
  });
});
