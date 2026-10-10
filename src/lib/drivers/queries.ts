import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookings, driverProfiles, users } from "@/db/schema";

export type RenterFilter = "review" | "all";

// Customers with their license status and number of bookings. "review" lists the licenses
// waiting to be checked, oldest first; "all" everyone who ever booked or sent a license.
export async function listRenters(filter: RenterFilter, page: number, pageSize = 50) {
  const bookingCount =
    sql<number>`(select count(*) from ${bookings} where ${bookings.customerId} = ${users.id})`.mapWith(
      Number,
    );
  const base = db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      status: driverProfiles.status,
      submittedAt: driverProfiles.submittedAt,
      bookingCount,
    })
    .from(users)
    .leftJoin(driverProfiles, eq(driverProfiles.userId, users.id));
  const query =
    filter === "review"
      ? base.where(eq(driverProfiles.status, "pending")).orderBy(asc(driverProfiles.submittedAt))
      : base
          .where(
            sql`${users.role} = 'customer' and (${driverProfiles.userId} is not null or ${bookingCount} > 0)`,
          )
          .orderBy(desc(users.createdAt));
  const rows = await query.limit(pageSize + 1).offset((page - 1) * pageSize);
  return { rows: rows.slice(0, pageSize), hasMore: rows.length > pageSize };
}

export async function countLicensesToReview() {
  return db.$count(driverProfiles, eq(driverProfiles.status, "pending"));
}

export async function getRenter(userId: string) {
  const [renter] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId));
  return renter ?? null;
}
