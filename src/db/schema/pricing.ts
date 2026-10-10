// Prices besides each car model's own rates: seasons, extras and coupons. All amounts are
// integers in the currency's smallest unit (cents).
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// A date range when every price goes up or down by a percentage: "Summer +20%", "Low season
// -15%". Seasons can't overlap, so each day has at most one.
export const seasons = pgTable(
  "seasons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    // Calendar dates at the business, both included.
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on").notNull(),
    // +20 means 20% more, -15 means 15% less.
    adjustmentPercent: integer("adjustment_percent").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("seasons_ends_after_start", sql`${table.endsOn} >= ${table.startsOn}`),
    check("seasons_adjustment_range", sql`${table.adjustmentPercent} between -90 and 500`),
  ],
);

export const extraChargeEnum = pgEnum("extra_charge", ["per_day", "per_rental"]);

// Things customers can add to a booking: child seat, GPS, extra driver, full insurance...
export const extras = pgTable("extras", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(),
  charge: extraChargeEnum("charge").notNull(),
  // How many a customer can add (3 child seats, 1 GPS).
  maxQuantity: integer("max_quantity").notNull().default(1),
  // Hidden extras aren't offered anymore; old bookings keep them.
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const couponTypeEnum = pgEnum("coupon_type", ["percent", "fixed"]);

// Discount codes for the rental price (not extras, fees or tax).
export const coupons = pgTable(
  "coupons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Saved in uppercase; customers can type it in any case.
    code: text("code").notNull(),
    type: couponTypeEnum("type").notNull(),
    // A percentage (1-100) for "percent", an amount in cents for "fixed".
    amount: integer("amount").notNull(),
    // Optional: the dates (at the business) when the code can be used to book.
    validFrom: date("valid_from"),
    validUntil: date("valid_until"),
    // Optional: only for rentals of at least this many days.
    minDays: integer("min_days"),
    // Optional: how many bookings can use it in total.
    maxUses: integer("max_uses"),
    timesUsed: integer("times_used").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("coupons_code_unique").on(table.code)],
);
