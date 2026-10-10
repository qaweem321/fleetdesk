import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { bookings } from "@/db/schema";

// Cancels a booking that hasn't been picked up yet. Returns false when it was already picked
// up, completed or cancelled (for example by someone else a moment ago). The car is free
// again right away: cancelled bookings don't hold cars.
export async function cancelBooking(bookingId: string, reason: string) {
  const now = new Date();
  const updated = await db
    .update(bookings)
    .set({ status: "cancelled", cancelledAt: now, cancelReason: reason, updatedAt: now })
    .where(
      and(eq(bookings.id, bookingId), inArray(bookings.status, ["pending_payment", "confirmed"])),
    )
    .returning({ id: bookings.id });
  return updated.length > 0;
}
