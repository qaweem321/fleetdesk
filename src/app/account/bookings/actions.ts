"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import type { ActionState } from "@/lib/action-state";
import { cancelBooking } from "@/lib/bookings/cancel";
import { getBooking } from "@/lib/bookings/queries";
import { customerCanCancel } from "@/lib/bookings/status";
import { sendBookingCancelledEmails } from "@/lib/notifications/booking-emails";
import { startCheckout } from "@/lib/payments/checkout";
import { bookingLedger, refundOnlinePayments } from "@/lib/payments/records";
import { requireUser } from "@/lib/session";
import { requireSettings } from "@/lib/settings";
import { isUuid } from "@/lib/uuid";

async function myBooking(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));
  const booking = isUuid(id) ? await getBooking(id, user.id) : null;
  if (!booking) {
    throw new Error("Booking not found.");
  }
  return { user, booking };
}

// A customer cancels their own booking, within the free cancellation period. Anything paid
// online is refunded in full.
export async function cancelMyBooking(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const [{ booking }, settings] = await Promise.all([myBooking(formData), requireSettings()]);
  if (!customerCanCancel(booking, settings.freeCancellationHours)) {
    return { error: "This booking can no longer be cancelled online. Please contact us." };
  }
  if (!(await cancelBooking(booking.id, "Cancelled by the customer."))) {
    return { error: "This booking was already changed. Please reload the page." };
  }
  const { paid } = await bookingLedger(booking.id, booking.total);
  let refundProblem = false;
  if (paid > 0) {
    // The booking is cancelled either way; a refund that fails now is done by staff from the
    // booking page (it shows what was paid), so don't show the customer an error page.
    try {
      await refundOnlinePayments(booking.id, paid, "Refund: cancelled by the customer");
    } catch (error) {
      console.error("Refund after cancellation failed:", error);
      refundProblem = true;
    }
  }
  after(() =>
    sendBookingCancelledEmails({ ...booking, status: "cancelled" }, settings, "customer").catch(
      console.error,
    ),
  );
  revalidatePath(`/account/bookings/${booking.id}`);
  revalidatePath("/account");
  const refund = refundProblem
    ? " Your refund couldn't be started automatically; we'll send it to you shortly."
    : "";
  return { success: `Your booking is cancelled.${refund} We've sent you a confirmation email.` };
}

// Back to the payment page for a booking that's still waiting for its online payment.
export async function payMyBooking(formData: FormData) {
  const { user, booking } = await myBooking(formData);
  if (booking.status !== "pending_payment") {
    redirect(`/account/bookings/${booking.id}`);
  }
  redirect(await startCheckout(booking, user));
}
