// Money that moved for a booking: payments, refunds, deposits and extra charges. Every amount
// is in cents of the booking's currency. Rows are only added, never changed, so the history
// of a booking's money is always complete.
import { sql } from "drizzle-orm";
import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { bookings } from "./bookings";

export const paymentKindEnum = pgEnum("payment_kind", [
  // The customer paid (online or at the counter).
  "payment",
  // Money given back to the customer.
  "refund",
  // A deposit held on the card (not charged yet).
  "deposit_hold",
  // Part or all of a held deposit was charged (damage, fuel, late return...).
  "deposit_capture",
  // A held deposit was let go: nothing charged.
  "deposit_release",
]);

export const paymentMethodKindEnum = pgEnum("payment_method_kind", [
  // Through Stripe (online checkout, or the card saved at checkout).
  "stripe",
  // Recorded by staff: cash, the card terminal at the counter, a bank transfer...
  "cash",
  "card_terminal",
  "other",
]);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    kind: paymentKindEnum("kind").notNull(),
    method: paymentMethodKindEnum("method").notNull(),
    amount: integer("amount").notNull(),
    // What it was for, shown on the receipt: "Rental", "Fuel refill", "Scratch on rear bumper".
    description: text("description").notNull(),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    stripeRefundId: text("stripe_refund_id"),
    // The staff member who recorded it (empty for online payments).
    createdById: text("created_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("payments_booking_id_idx").on(table.bookingId),
    // Stripe can report the same payment twice (a webhook and the return page): it's saved
    // only once. A payment can have several (partial) refunds, each saved once.
    uniqueIndex("payments_stripe_once")
      .on(table.stripePaymentIntentId)
      .where(sql`${table.kind} = 'payment'`),
    uniqueIndex("payments_stripe_refund_once").on(table.stripeRefundId),
  ],
);
