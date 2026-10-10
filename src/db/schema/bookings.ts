// Bookings: who rents which car, when, and what it costs. Prices are copied onto the booking
// when it's made, so later price changes never change an existing booking.
import { sql } from "drizzle-orm";
import {
  check,
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
import { carModels, locations, vehicles } from "./fleet";
import { coupons, extraChargeEnum, extras } from "./pricing";

export const bookingStatusEnum = pgEnum("booking_status", [
  // Waiting for the online payment; the car is held until hold_expires_at.
  "pending_payment",
  // Booked; the car is reserved.
  "confirmed",
  // Picked up: the customer has the car.
  "active",
  // Returned and settled.
  "completed",
  "cancelled",
]);

export const paymentMethodEnum = pgEnum("payment_method", ["pay_at_pickup", "online"]);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Short code for people: "FD-7K3M9Q" on emails, the agreement and at the counter.
    reference: text("reference").notNull(),
    // The account that booked. Kept as a copy below, so history survives a deleted account.
    customerId: text("customer_id").references(() => users.id, { onDelete: "set null" }),
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email").notNull(),
    customerPhone: text("customer_phone").notNull(),
    carModelId: uuid("car_model_id")
      .notNull()
      .references(() => carModels.id, { onDelete: "restrict" }),
    // The car assigned to this booking. Staff can swap it for another one before pickup.
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "restrict" }),
    pickupLocationId: uuid("pickup_location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "restrict" }),
    returnLocationId: uuid("return_location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "restrict" }),
    pickupAt: timestamp("pickup_at", { withTimezone: true }).notNull(),
    returnAt: timestamp("return_at", { withTimezone: true }).notNull(),
    // When the car can go out again: the return time plus the cleaning time (Settings). The
    // no-double-booking rule uses pickup_at to ready_at.
    readyAt: timestamp("ready_at", { withTimezone: true }).notNull(),
    status: bookingStatusEnum("status").notNull(),
    paymentMethod: paymentMethodEnum("payment_method").notNull(),
    // The price when booked, in cents of `currency`.
    currency: text("currency").notNull(),
    days: integer("days").notNull(),
    rentalPrice: integer("rental_price").notNull(),
    extrasTotal: integer("extras_total").notNull(),
    dropOffFee: integer("drop_off_fee").notNull(),
    discount: integer("discount").notNull(),
    taxRate: integer("tax_rate").notNull(),
    taxName: text("tax_name").notNull(),
    tax: integer("tax").notNull(),
    total: integer("total").notNull(),
    depositAmount: integer("deposit_amount").notNull(),
    couponId: uuid("coupon_id").references(() => coupons.id, { onDelete: "set null" }),
    couponCode: text("coupon_code"),
    // A note from the customer ("flight BA123, arriving 14:00").
    customerNote: text("customer_note"),
    // Until when a "pending_payment" booking holds the car.
    holdExpiresAt: timestamp("hold_expires_at", { withTimezone: true }),
    // Online payment: the Stripe Checkout session, and the card saved there for the deposit and
    // any charges after the return.
    stripeCheckoutSessionId: text("stripe_checkout_session_id"),
    stripePaymentMethodId: text("stripe_payment_method_id"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelReason: text("cancel_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("bookings_reference_unique").on(table.reference),
    index("bookings_customer_id_idx").on(table.customerId),
    index("bookings_vehicle_id_idx").on(table.vehicleId),
    index("bookings_pickup_at_idx").on(table.pickupAt),
    check("bookings_return_after_pickup", sql`${table.returnAt} > ${table.pickupAt}`),
    check("bookings_ready_after_return", sql`${table.readyAt} >= ${table.returnAt}`),
    // The no-double-booking rule (an exclusion constraint) is added in a hand-written
    // migration, because Drizzle can't describe it: see drizzle/0004_no_double_bookings.sql.
  ],
);

// The extras on a booking, copied with their price at booking time.
export const bookingExtras = pgTable(
  "booking_extras",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    extraId: uuid("extra_id").references(() => extras.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    price: integer("price").notNull(),
    charge: extraChargeEnum("charge").notNull(),
    quantity: integer("quantity").notNull(),
    amount: integer("amount").notNull(),
  },
  (table) => [index("booking_extras_booking_id_idx").on(table.bookingId)],
);
