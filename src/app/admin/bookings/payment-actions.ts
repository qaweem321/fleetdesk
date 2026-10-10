"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { payments } from "@/db/schema";
import type { ActionState } from "@/lib/action-state";
import { getBooking } from "@/lib/bookings/queries";
import { formReader } from "@/lib/form-input";
import { formatMoney } from "@/lib/money";
import { parseManualPayment } from "@/lib/payments/input";
import { bookingLedger, refundOnlinePayments } from "@/lib/payments/records";
import { requireStaff } from "@/lib/session";
import { isUuid } from "@/lib/uuid";

async function findBooking(id: string) {
  const booking = isUuid(id) ? await getBooking(id) : null;
  if (!booking) {
    throw new Error("Booking not found.");
  }
  return booking;
}

// Staff record money taken at the counter: cash, the card terminal, a bank transfer...
export async function recordPayment(
  bookingId: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const [user, booking] = await Promise.all([requireStaff(), findBooking(bookingId)]);
  const parsed = parseManualPayment(formReader(formData), booking.currency);
  if ("error" in parsed) {
    return parsed;
  }
  await db
    .insert(payments)
    .values({ bookingId: booking.id, kind: "payment", createdById: user.id, ...parsed.values });
  revalidatePath(`/admin/bookings/${booking.id}`);
  return { success: `${formatMoney(parsed.values.amount, booking.currency)} recorded.` };
}

// Gives money back. Online payments are refunded through Stripe automatically; money taken at
// the counter is given back there and recorded here.
export async function refundPayment(
  bookingId: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const [user, booking] = await Promise.all([
    requireStaff("payments:refund"),
    findBooking(bookingId),
  ]);
  const read = formReader(formData);
  const parsed = parseManualPayment(read, booking.currency);
  if ("error" in parsed) {
    return parsed;
  }
  const { amount, description } = parsed.values;
  const ledger = await bookingLedger(booking.id, booking.total);
  if (amount > ledger.paid) {
    return { error: `At most ${formatMoney(ledger.paid, booking.currency)} has been paid.` };
  }
  if (read("via") === "stripe") {
    const refunded = await refundOnlinePayments(booking.id, amount, `Refund: ${description}`);
    revalidatePath(`/admin/bookings/${booking.id}`);
    return refunded === amount
      ? { success: `${formatMoney(refunded, booking.currency)} refunded to the customer's card.` }
      : {
          error: `Only ${formatMoney(refunded, booking.currency)} could be refunded online (that's what was paid online). Refund the rest at the counter.`,
        };
  }
  await db.insert(payments).values({
    bookingId: booking.id,
    kind: "refund",
    method: parsed.values.method,
    amount,
    description: `Refund: ${description}`,
    createdById: user.id,
  });
  revalidatePath(`/admin/bookings/${booking.id}`);
  return { success: `Refund of ${formatMoney(amount, booking.currency)} recorded.` };
}
