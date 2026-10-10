import { and, asc, desc, eq, gte, lte, ne, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { coupons, extras, seasons } from "@/db/schema";
import { normalizeCouponCode } from "./coupon";

export async function listSeasons() {
  return db.select().from(seasons).orderBy(asc(seasons.startsOn));
}

// A season that shares at least one day with the given range (seasons can't overlap).
export async function findOverlappingSeason(startsOn: string, endsOn: string, exceptId?: string) {
  const conditions: SQL[] = [lte(seasons.startsOn, endsOn), gte(seasons.endsOn, startsOn)];
  if (exceptId) {
    conditions.push(ne(seasons.id, exceptId));
  }
  const [found] = await db
    .select({ name: seasons.name })
    .from(seasons)
    .where(and(...conditions))
    .limit(1);
  return found ?? null;
}

export async function listExtras({ activeOnly = false } = {}) {
  return db
    .select()
    .from(extras)
    .where(activeOnly ? eq(extras.active, true) : undefined)
    .orderBy(desc(extras.active), asc(extras.name));
}

export async function listCoupons() {
  return db.select().from(coupons).orderBy(desc(coupons.active), asc(coupons.code));
}

export async function findCouponByCode(code: string) {
  const [coupon] = await db
    .select()
    .from(coupons)
    .where(eq(coupons.code, normalizeCouponCode(code)));
  return coupon ?? null;
}
