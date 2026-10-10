"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import type { ActionState } from "@/lib/action-state";
import { cancelBooking } from "@/lib/bookings/cancel";
import { getBooking } from "@/lib/bookings/queries";
import { formReader } from "@/lib/form-input";
import { sendBookingCancelledEmails } from "@/lib/notifications/booking-emails";
import { requireStaff } from "@/lib/session";
import { requireSettings } from "@/lib/settings";
import { isUuid } from "@/lib/uuid";

// Staff cancel a booking that hasn't been picked up, at any time, with a reason the customer
// sees in their email.
export async function staffCancelBooking(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const [, settings] = await Promise.all([requireStaff(), requireSettings()]);
  const read = formReader(formData);
  const id = read("id");
  const reason = read("reason");
  if (!reason) {
    return { error: "Please give a reason. The customer sees it in their email." };
  }
  if (reason.length > 300) {
    return { error: "The reason can be at most 300 characters." };
  }
  const booking = isUuid(id) ? await getBooking(id) : null;
  if (!booking) {
    throw new Error("Booking not found.");
  }
  if (!(await cancelBooking(booking.id, reason))) {
    return { error: "Only bookings that haven't been picked up can be cancelled." };
  }
  if (read("notify") === "on") {
    after(() =>
      sendBookingCancelledEmails(
        { ...booking, status: "cancelled", cancelReason: reason },
        settings,
        "staff",
      ).catch(console.error),
    );
  }
  revalidatePath(`/admin/bookings/${booking.id}`);
  revalidatePath("/admin/bookings");
  return { success: "Booking cancelled. The car is free again." };
}
