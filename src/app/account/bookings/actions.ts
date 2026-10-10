"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import type { ActionState } from "@/lib/action-state";
import { cancelBooking } from "@/lib/bookings/cancel";
import { getBooking } from "@/lib/bookings/queries";
import { customerCanCancel } from "@/lib/bookings/status";
import { sendBookingCancelledEmails } from "@/lib/notifications/booking-emails";
import { requireUser } from "@/lib/session";
import { requireSettings } from "@/lib/settings";
import { isUuid } from "@/lib/uuid";

// A customer cancels their own booking, within the free cancellation period.
export async function cancelMyBooking(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const [user, settings] = await Promise.all([requireUser(), requireSettings()]);
  const id = String(formData.get("id"));
  const booking = isUuid(id) ? await getBooking(id, user.id) : null;
  if (!booking) {
    throw new Error("Booking not found.");
  }
  if (!customerCanCancel(booking, settings.freeCancellationHours)) {
    return { error: "This booking can no longer be cancelled online. Please contact us." };
  }
  if (!(await cancelBooking(booking.id, "Cancelled by the customer."))) {
    return { error: "This booking was already changed. Please reload the page." };
  }
  after(() =>
    sendBookingCancelledEmails({ ...booking, status: "cancelled" }, settings, "customer").catch(
      console.error,
    ),
  );
  revalidatePath(`/account/bookings/${booking.id}`);
  revalidatePath("/account");
  return { success: "Your booking is cancelled. We've sent you a confirmation email." };
}
