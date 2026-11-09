import type { Order } from "../types";

/** The gateway timed out or was briefly unavailable. Safe to retry. */
export class TransientPaymentError extends Error {
  override name = "TransientPaymentError";
}

/** The card was declined. Retrying will not help. */
export class PaymentDeclinedError extends Error {
  override name = "PaymentDeclinedError";
}

export interface PaymentGateway {
  charge(orderId: string, amountCents: number): Promise<{ transactionId: string }>;
}

export const isTransient = (err: unknown): boolean => err instanceof TransientPaymentError;

export interface RetryOptions {
  /** Maximum number of calls to `fn`, including the first one. */
  attempts: number;
  /** Decides whether an error is worth retrying. Defaults to `isTransient`. */
  isRetryable?: (err: unknown) => boolean;
}

/**
 * Calls `fn` up to `attempts` times.
 *  - Resolves with the first successful result.
 *  - Errors that are not retryable are thrown right away.
 *  - If every attempt fails, throws the last error.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  { attempts, isRetryable = isTransient }: RetryOptions,
): Promise<T> {
  let lastError: unknown = new RangeError("withRetry: attempts must be >= 1");
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return fn();
    } catch (err) {
      lastError = err;
      if (!isRetryable(err)) throw err;
    }
  }
  throw lastError;
}

export interface ProcessingReport {
  charged: Array<{ orderId: string; transactionId: string }>;
  failed: Array<{ orderId: string; reason: string }>;
}

/**
 * Nightly batch job: charges every order through the payment gateway.
 *  - Transient gateway errors are retried (up to `attempts` calls per order).
 *  - Any other error marks that order as failed. One failure must not stop the rest.
 *  - `charged` and `failed` list orders in the same order as the input.
 */
export async function processOrders(
  orders: readonly Order[],
  gateway: PaymentGateway,
  { attempts = 3 }: { attempts?: number } = {},
): Promise<ProcessingReport> {
  const report: ProcessingReport = { charged: [], failed: [] };

  orders.forEach(async (order) => {
    try {
      const { transactionId } = await withRetry(
        () => gateway.charge(order.id, order.totalCents),
        { attempts },
      );
      report.charged.push({ orderId: order.id, transactionId });
    } catch (err) {
      report.failed.push({
        orderId: order.id,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  });

  return report;
}
