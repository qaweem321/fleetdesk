import { and, eq, inArray, lt, type SQL, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookings, coupons } from "@/db/schema";

// Cancels the bookings matching `where` and gives their coupon uses back, in one statement: a
// limited code isn't used up by bookings nobody paid for or that were cancelled.
async function cancelBookings(where: SQL, reason: string, now: Date) {
  const result = await db.execute<{ id: string }>(sql`
    with cancelled as (
      update ${bookings}
      set status = 'cancelled', cancelled_at = ${now}, cancel_reason = ${reason}, updated_at = ${now}
      where ${where}
      returning ${bookings.id} as id, ${bookings.couponId} as coupon_id
    ), released as (
      update ${coupons}
      set times_used = greatest(${coupons.timesUsed} - used.count, 0)
      from (
        select coupon_id, count(*)::int as count from cancelled
        where coupon_id is not null group by coupon_id
      ) as used
      where ${coupons.id} = used.coupon_id
    )
    select id from cancelled`);
  // The two database drivers return rows differently.
  return Array.isArray(result) ? result : result.rows;
}

// Cancels a booking that hasn't been picked up yet. Returns false when it was already picked
// up, completed or cancelled (for example by someone else a moment ago). The car is free
// again right away: cancelled bookings don't hold cars.
export async function cancelBooking(bookingId: string, reason: string) {
  const cancelled = await cancelBookings(
    and(
      eq(bookings.id, bookingId),
      inArray(bookings.status, ["pending_payment", "confirmed"]),
    ) as SQL,
    reason,
    new Date(),
  );
  return cancelled.length > 0;
}

// Bookings waiting for an online payment that didn't come in time stop holding their car.
// Run before checking availability, so an abandoned checkout never blocks a car for long.
export async function releaseExpiredHolds(now = new Date()) {
  await cancelBookings(
    and(eq(bookings.status, "pending_payment"), lt(bookings.holdExpiresAt, now)) as SQL,
    "The online payment wasn't completed in time.",
    now,
  );
}
