import { randomBytes, randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { atomic } from "@/db/atomic";
import { bookingExtras, bookings, coupons, users } from "@/db/schema";
import { isExclusionViolation, isUniqueViolation } from "@/lib/action-state";
import { type BuiltQuote, buildQuote, type QuoteRequest } from "@/lib/pricing/build-quote";
import type { BusinessSettings } from "@/lib/settings";
import { bookingWindow, freeVehicles, releaseExpiredHolds, type Window } from "./availability";
import { makeReference } from "./status";

type Customer = { id: string; name: string; email: string; phone: string };

type CreateBooking = {
  request: QuoteRequest;
  customer: Customer;
  note: string | null;
  settings: BusinessSettings;
};

export type CreateResult =
  | { bookingId: string; reference: string }
  | { error: string; couponError?: string | null };

type Row = CreateBooking & { built: BuiltQuote; window: Window; vehicleId: string };

// Everything the booking stores: who, which car, when, and the price as it is right now.
function bookingRow({ request, customer, note, settings, built, window, vehicleId }: Row) {
  const { quote, model } = built;
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
    // Online payments come in phase 5; until then everything is paid at pickup.
    status: "confirmed" as const,
    paymentMethod: "pay_at_pickup" as const,
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
      await atomic((tx) => [
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
        ...(built.coupon
          ? [
              tx
                .update(coupons)
                .set({ timesUsed: sql`${coupons.timesUsed} + 1` })
                .where(eq(coupons.id, built.coupon.id)),
            ]
          : []),
      ]);
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

// For the confirmation page and emails: is the car still free right now? (Shown before the
// customer presses "Book".)
export async function hasFreeVehicle(request: QuoteRequest, settings: BusinessSettings) {
  const window = bookingWindow(request.start, request.end, settings.turnaroundMinutes);
  const found = await freeVehicles(request.carModelId, request.pickupLocationId, window, 1);
  return found.length > 0;
}
