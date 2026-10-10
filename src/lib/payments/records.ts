import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { summarizePayments } from "./ledger";
import { getStripe } from "./stripe";

// Gives back up to `amount` of a booking's online payments through Stripe, and records it.
// Payments made at the counter (cash, card terminal) are refunded there by staff, who record it
// themselves. Returns the amount refunded online.
export async function refundOnlinePayments(bookingId: string, amount: number, reason: string) {
  const rows = await db
    .select()
    .from(payments)
    .where(and(eq(payments.bookingId, bookingId), eq(payments.method, "stripe")))
    .orderBy(asc(payments.createdAt));

  let left = amount;
  for (const payment of rows.filter((row) => row.kind === "payment" && row.stripePaymentIntentId)) {
    if (left <= 0) {
      break;
    }
    // What's still refundable on this payment.
    const refundedAlready = rows
      .filter(
        (row) =>
          row.kind === "refund" && row.stripePaymentIntentId === payment.stripePaymentIntentId,
      )
      .reduce((sum, row) => sum + row.amount, 0);
    const refundable = Math.min(left, payment.amount - refundedAlready);
    if (refundable <= 0) {
      continue;
    }
    const refund = await getStripe().refunds.create({
      payment_intent: payment.stripePaymentIntentId as string,
      amount: refundable,
      metadata: { bookingId },
    });
    await db
      .insert(payments)
      .values({
        bookingId,
        kind: "refund",
        method: "stripe",
        amount: refund.amount,
        description: reason,
        stripePaymentIntentId: payment.stripePaymentIntentId,
        stripeRefundId: refund.id,
      })
      .onConflictDoNothing();
    left -= refund.amount;
  }
  return amount - left;
}

// What a booking's money looks like now: paid, refunded, deposit held, still due.
export async function bookingLedger(bookingId: string, total: number) {
  const rows = await db
    .select({ kind: payments.kind, amount: payments.amount })
    .from(payments)
    .where(eq(payments.bookingId, bookingId));
  return summarizePayments(rows, total);
}

// A booking's payment records, newest last, for the staff page and the receipt.
export async function listPayments(bookingId: string) {
  return db
    .select()
    .from(payments)
    .where(eq(payments.bookingId, bookingId))
    .orderBy(asc(payments.createdAt));
}
