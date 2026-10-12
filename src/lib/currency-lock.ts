import { sql } from "drizzle-orm";
import { db } from "@/db";
import { bookings, carModels, coupons, extras } from "@/db/schema";

// Prices, fees, coupons and bookings are stored as whole numbers in the currency's smallest
// unit, so switching currency would silently turn $49.99 into ¥4,999. Once any of them exists,
// the currency stays as it is. One query.
export async function currencyInUse() {
  const [row] = await db
    .execute<{ used: boolean }>(sql`
    select exists (select 1 from ${carModels})
      or exists (select 1 from ${bookings})
      or exists (select 1 from ${extras})
      or exists (select 1 from ${coupons}) as used`)
    .then((result) => (Array.isArray(result) ? result : result.rows));
  return Boolean(row?.used);
}
