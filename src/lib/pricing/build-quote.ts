import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { carModels, extras, locations } from "@/db/schema";
import type { BusinessSettings } from "@/lib/settings";
import { localDateKey } from "@/lib/time-zone";
import { couponProblem } from "./coupon";
import { findCouponByCode, listSeasons } from "./queries";
import { calculateQuote, type Quote } from "./quote";
import { rentalDays } from "./rental-days";

export type QuoteRequest = {
  carModelId: string;
  pickupLocationId: string;
  returnLocationId: string;
  start: Date;
  end: Date;
  // Extra id -> how many.
  extras: Map<string, number>;
  couponCode: string;
};

export type BuiltQuote = {
  quote: Quote;
  model: typeof carModels.$inferSelect;
  // The coupon that was applied (null when none or when it can't be used).
  coupon: { id: string; code: string } | null;
  // Why the typed coupon wasn't applied, to show next to the coupon field.
  couponError: string | null;
};

// Loads everything a price depends on and calculates it: the one place a price is made, so the
// website, the booking and the admin preview always agree. With `forCustomer`, the booking
// rules apply too (notice period, longest rental, only bookable models and locations).
export async function buildQuote(
  request: QuoteRequest,
  settings: BusinessSettings,
  { forCustomer, now = new Date() }: { forCustomer: boolean; now?: Date },
): Promise<BuiltQuote | { error: string }> {
  if (request.end <= request.start) {
    return { error: "The return must be after the pickup." };
  }
  const days = rentalDays(request.start, request.end, settings.graceMinutes);
  if (forCustomer) {
    if (request.start.getTime() < now.getTime() + settings.minLeadHours * 3_600_000) {
      return {
        error:
          settings.minLeadHours > 0
            ? `Online bookings need at least ${settings.minLeadHours} hours' notice.`
            : "The pickup time has already passed.",
      };
    }
    if (days > settings.maxRentalDays) {
      return { error: `Online bookings can be at most ${settings.maxRentalDays} days.` };
    }
  }

  const extraIds = [...request.extras.keys()];
  const [[model], chosenLocations, seasonRules, chosenExtras, coupon] = await Promise.all([
    db.select().from(carModels).where(eq(carModels.id, request.carModelId)),
    db
      .select()
      .from(locations)
      .where(inArray(locations.id, [request.pickupLocationId, request.returnLocationId])),
    listSeasons(),
    extraIds.length > 0
      ? db
          .select()
          .from(extras)
          .where(and(inArray(extras.id, extraIds), eq(extras.active, true)))
      : Promise.resolve([]),
    request.couponCode ? findCouponByCode(request.couponCode) : Promise.resolve(null),
  ]);
  const pickup = chosenLocations.find((location) => location.id === request.pickupLocationId);
  const dropOff = chosenLocations.find((location) => location.id === request.returnLocationId);
  if (!model || (forCustomer && (!model.active || model.dailyRate <= 0))) {
    return { error: "This car isn't available for booking." };
  }
  if (!pickup || !dropOff || (forCustomer && (!pickup.active || !dropOff.active))) {
    return { error: "Please choose the pickup and return locations again." };
  }

  let couponError: string | null = null;
  if (request.couponCode && !coupon) {
    couponError = "We don't know this code. Please check the spelling.";
  } else if (coupon) {
    couponError = couponProblem(coupon, localDateKey(now, settings.timeZone), days);
  }
  const appliedCoupon = coupon && !couponError ? coupon : null;

  const quote = calculateQuote({
    start: request.start,
    end: request.end,
    timeZone: settings.timeZone,
    graceMinutes: settings.graceMinutes,
    rates: { dailyRate: model.dailyRate, weeklyRate: model.weeklyRate },
    seasons: seasonRules,
    extras: chosenExtras.map((extra) => ({
      id: extra.id,
      name: extra.name,
      price: extra.price,
      charge: extra.charge,
      // Never more than the extra allows, whatever the browser sent.
      quantity: Math.min(request.extras.get(extra.id) ?? 0, extra.maxQuantity),
    })),
    dropOffFee: pickup.id === dropOff.id ? 0 : dropOff.dropOffFee,
    coupon: appliedCoupon,
    taxRate: settings.taxRate,
  });

  return {
    quote,
    model,
    coupon: appliedCoupon ? { id: appliedCoupon.id, code: appliedCoupon.code } : null,
    couponError,
  };
}
