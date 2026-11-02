import Decimal from "decimal.js";
import type { Delivery, Invoice } from "./types";

/** Quantity precision is 0.001 MT (one kg); money is rounded separately to paise. */
export const q3 = (n: number) => new Decimal(n).toDecimalPlaces(3, Decimal.ROUND_HALF_UP).toNumber();
export function deliveryBalance(delivery: Delivery, invoices: Invoice[]) {
  const billed = invoices.reduce((sum, i) => {
    const allocation = i.delivery_quantities?.[delivery.id];
    // Legacy invoices linked whole receipts. Do not count both the old link and the allocation.
    return sum.plus(allocation !== undefined ? allocation : i.delivery_ids.includes(delivery.id) ? delivery.qty : 0);
  }, new Decimal(0));
  return { billed: q3(billed.toNumber()), remaining: q3(new Decimal(delivery.qty).minus(billed).toNumber()) };
}

export function validateAllocations(deliveries: Delivery[], invoices: Invoice[], ids: string[], quantities?: Record<string, number>) {
  if (!ids.length || new Set(ids).size !== ids.length) throw new Error("Select each receipt or dispatch only once.");
  const allocations: Record<string, number> = {};
  for (const id of ids) {
    const delivery = deliveries.find((d) => d.id === id);
    if (!delivery) throw new Error("A selected receipt belongs to another order or no longer exists.");
    const { remaining } = deliveryBalance(delivery, invoices);
    const qty = quantities?.[id] ?? remaining;
    if (!Number.isFinite(qty) || qty <= 0 || q3(qty) !== qty) throw new Error("Enter a positive quantity with at most three decimal places.");
    if (qty > remaining) throw new Error(`Receipt ${delivery.bill_no} has only ${remaining} left to bill. Refresh and check the quantity.`);
    allocations[id] = qty;
  }
  return allocations;
}

export const normaliseBillNo = (n: string) => n.trim().toUpperCase();
