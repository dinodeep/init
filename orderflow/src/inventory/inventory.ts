import type { StockStore } from "./stockStore";

interface Reservation {
  sku: string;
  quantity: number;
}

/**
 * Holds stock for a customer while they check out.
 *
 * Requirements:
 *  - Never oversell. The sum of active reservations for a SKU can never be
 *    more than the stock that was available.
 *  - `reserve` is idempotent per reservationId. Clients retry on timeouts, so
 *    the same reservation may arrive more than once, even concurrently.
 *  - `release` is idempotent too. Releasing twice must not put stock back twice.
 *  - Many checkouts run at the same time, so all of the above must hold under
 *    concurrent calls.
 */
export class InventoryService {
  private readonly reservations = new Map<string, Reservation>();

  constructor(private readonly store: StockStore) {}

  /** Returns true if the stock is now held for this reservation, false if there isn't enough. */
  async reserve(reservationId: string, sku: string, quantity: number): Promise<boolean> {
    if (this.reservations.has(reservationId)) return true;

    const available = (await this.store.get(sku)) ?? 0;
    if (available < quantity) return false;

    await this.store.set(sku, available - quantity);
    this.reservations.set(reservationId, { sku, quantity });
    return true;
  }

  /** Returns held stock to the pool. Unknown or already-released ids are ignored. */
  async release(reservationId: string): Promise<void> {
    const reservation = this.reservations.get(reservationId);
    if (!reservation) return;

    const available = (await this.store.get(reservation.sku)) ?? 0;
    await this.store.set(reservation.sku, available + reservation.quantity);
    this.reservations.delete(reservationId);
  }

  activeReservationCount(): number {
    return this.reservations.size;
  }
}
