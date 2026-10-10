import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { bookings, users } from "@/db/schema";

// Reasons a user can't delete their account yet. An empty list means they can.
export async function accountDeletionBlockers(userId: string) {
  const [[user], openBookings] = await Promise.all([
    db.select({ role: users.role }).from(users).where(eq(users.id, userId)),
    db.$count(
      bookings,
      and(
        eq(bookings.customerId, userId),
        inArray(bookings.status, ["pending_payment", "confirmed", "active"]),
      ),
    ),
  ]);
  const blockers: string[] = [];

  if (openBookings > 0) {
    blockers.push(
      "You have an upcoming or ongoing rental. Your account can be deleted once it's finished or cancelled.",
    );
  }

  if (user?.role === "owner") {
    const owners = await db.$count(users, eq(users.role, "owner"));
    if (owners === 1) {
      blockers.push("You're the only owner. Make another staff member an owner first.");
    }
  }
  return blockers;
}
