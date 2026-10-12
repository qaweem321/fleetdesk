import { randomBytes, randomUUID } from "node:crypto";
import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { atomic } from "@/db/atomic";
import { bookingExtras, bookings, coupons, users } from "@/db/schema";
import { isExclusionViolation, isUniqueViolation } from "@/lib/action-state";
import { HOLD_MINUTES, type PaymentMethod } from "@/lib/payments/options";
import { type BuiltQuote, buildQuote, type QuoteRequest } from "@/lib/pricing/build-quote";
import type { BusinessSettings } from "@/lib/settings";
import { bookingWindow, freeVehicles, type Window } from "./availability";
import { releaseExpiredHolds } from "./cancel";
import { makeReference } from "./status";

type Customer = { id: string; name: string; email: string; phone: string };

type CreateBooking = {
  request: QuoteRequest;
  customer: Customer;
  note: string | null;
  // Online: the booking waits for the payment (and holds the car meanwhile).
  paymentMethod: PaymentMethod;
  settings: BusinessSettings;
};

export type CreateResult =
  | { bookingId: string; reference: string }
  | { error: string; couponError?: string | null };

type Row = CreateBooking & { built: BuiltQuote; window: Window; vehicleId: string };

// Everything the booking stores: who, which car, when, and the price as it is right now.
function bookingRow({
  request,
  customer,
  note,
  paymentMethod,
  settings,
  built,
  window,
  vehicleId,
}: Row) {
  const { quote, model } = built;
  const online = paymentMethod === "online";
  return {
    customerId: customer.id,
    customerName: customer.name,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    carModelId: model.id,
    vehicleId,
    pickupLocationId: request.pickupLocationId,
    returnLocationId: request.returnLocationId,
    pickupAt: request.start,
    returnAt: request.end,
    readyAt: window.readyAt,
    status: online ? ("pending_payment" as const) : ("confirmed" as const),
    paymentMethod,
    holdExpiresAt: online ? new Date(Date.now() + HOLD_MINUTES * 60_000) : null,
    currency: settings.currency,
    days: quote.days,
    rentalPrice: quote.rentalPrice,
    extrasTotal: quote.extrasTotal,
    dropOffFee: quote.dropOffFee,
    discount: quote.discount,
    taxRate: settings.taxRate,
    taxName: settings.taxName,
    tax: quote.tax,
    total: quote.total,
    depositAmount: model.depositAmount,
    couponId: built.coupon?.id ?? null,
    couponCode: built.coupon?.code ?? null,
    customerNote: note,
  };
}

// Makes a booking: checks the price and rules, picks a free car and saves everything in one
// transaction. If another customer takes the same car at the same moment, the database refuses
// one of the two (no double bookings) and the next free car is tried.
export async function createBooking(input: CreateBooking): Promise<CreateResult> {
  const { request, customer, settings } = input;
  await releaseExpiredHolds();
  const built = await buildQuote(request, settings, { forCustomer: true });
  if ("error" in built) {
    return built;
  }
  // A coupon the customer typed but that can't be used: say so instead of silently booking
  // without the discount.
  if (built.couponError) {
    return { error: "Please fix or remove the coupon code.", couponError: built.couponError };
  }

  const window = bookingWindow(request.start, request.end, settings.turnaroundMinutes);
  const candidates = await freeVehicles(request.carModelId, request.pickupLocationId, window);
  for (const vehicle of candidates) {
    const bookingId = randomUUID();
    const reference = makeReference(randomBytes(6));
    try {
      const results = await atomic((tx) => [
        tx.insert(bookings).values({
          id: bookingId,
          reference,
          ...bookingRow({ ...input, built, window, vehicleId: vehicle.id }),
        }),
        ...built.quote.extras.map((line) =>
          tx.insert(bookingExtras).values({
            bookingId,
            extraId: line.id,
            name: line.name,
            price: line.price,
            charge: line.charge,
            quantity: line.quantity,
            amount: line.amount,
          }),
        ),
        // Remember the phone number for the next booking.
        tx.update(users).set({ phone: customer.phone }).where(eq(users.id, customer.id)),
        // Claimed in the same transaction, and only while uses are left: two bookings at the
        // same moment can't both take the last use.
        ...(built.coupon
          ? [
              tx
                .update(coupons)
                .set({ timesUsed: sql`${coupons.timesUsed} + 1` })
                .where(
                  and(
                    eq(coupons.id, built.coupon.id),
                    or(isNull(coupons.maxUses), lt(coupons.timesUsed, coupons.maxUses)),
                  ),
                )
                .returning({ id: coupons.id }),
            ]
          : []),
      ]);
      if (built.coupon && (results.at(-1) as unknown[]).length === 0) {
        // Someone used the last one a moment ago: undo this booking (its extras go with it).
        await db.delete(bookings).where(eq(bookings.id, bookingId));
        return {
          error: "Please fix or remove the coupon code.",
          couponError: "This code has been used up.",
        };
      }
      return { bookingId, reference };
    } catch (error) {
      // Taken by someone else a moment ago (or, very rarely, a reference already in use):
      // try the next car.
      if (isExclusionViolation(error) || isUniqueViolation(error)) {
        continue;
      }
      throw error;
    }
  }
  return {
    error:
      "Sorry, this car was just booked for these dates. Please choose another car or other dates.",
  };
}
