import { localDateKey } from "@/lib/time-zone";
import { couponDiscount } from "./coupon";
import { rentalDayStarts, rentalDays } from "./rental-days";

// The price calculator: one pure function used by the website, the booking itself and the
// admin price preview, so a customer always pays what they were shown.

export const WEEKLY_RATE_FROM_DAYS = 7;

export type RateCard = { dailyRate: number; weeklyRate: number | null };
export type SeasonRule = {
  name: string;
  startsOn: string;
  endsOn: string;
  adjustmentPercent: number;
};
export type ExtraChoice = {
  id: string;
  name: string;
  price: number;
  charge: "per_day" | "per_rental";
  quantity: number;
};

export type QuoteInput = {
  start: Date;
  end: Date;
  timeZone: string;
  graceMinutes: number;
  rates: RateCard;
  seasons: SeasonRule[];
  extras: ExtraChoice[];
  // The return location's drop-off fee, when it differs from the pickup location (else 0).
  dropOffFee: number;
  coupon: { type: "percent" | "fixed"; amount: number } | null;
  // Hundredths of a percent: 825 = 8.25%.
  taxRate: number;
};

export type QuoteLine = { id: string; name: string; quantity: number; amount: number };

export type Quote = {
  days: number;
  usesWeeklyRate: boolean;
  // The rental price before any coupon, seasons included.
  rentalPrice: number;
  // Names of the seasons that changed the price, e.g. ["Summer +20%"].
  seasonNotes: string[];
  extras: QuoteLine[];
  extrasTotal: number;
  dropOffFee: number;
  discount: number;
  tax: number;
  total: number;
};

function seasonFor(dateKey: string, seasons: SeasonRule[]) {
  return seasons.find((season) => season.startsOn <= dateKey && dateKey <= season.endsOn);
}

export function percentLabel(percent: number) {
  return `${percent > 0 ? "+" : ""}${percent}%`;
}

export function calculateQuote(input: QuoteInput): Quote {
  const days = rentalDays(input.start, input.end, input.graceMinutes);
  const usesWeeklyRate = days >= WEEKLY_RATE_FROM_DAYS && input.rates.weeklyRate !== null;
  // With the weekly price, each day costs a seventh of it (fractions are fine until rounding).
  const dayRate = usesWeeklyRate ? (input.rates.weeklyRate as number) / 7 : input.rates.dailyRate;

  // Count the days per price change, then round once per group: 7 days at the weekly price
  // add up to exactly the weekly price.
  const daysPerAdjustment = new Map<number, number>();
  const seasonNotes = new Set<string>();
  for (const dayStart of rentalDayStarts(input.start, days)) {
    const season = seasonFor(localDateKey(dayStart, input.timeZone), input.seasons);
    const adjustment = season?.adjustmentPercent ?? 0;
    daysPerAdjustment.set(adjustment, (daysPerAdjustment.get(adjustment) ?? 0) + 1);
    if (season && adjustment !== 0) {
      seasonNotes.add(`${season.name} ${percentLabel(adjustment)}`);
    }
  }
  let rentalPrice = 0;
  for (const [adjustment, count] of daysPerAdjustment) {
    rentalPrice += Math.round((count * dayRate * (100 + adjustment)) / 100);
  }

  const extras = input.extras
    .filter((extra) => extra.quantity > 0)
    .map((extra) => ({
      id: extra.id,
      name: extra.name,
      quantity: extra.quantity,
      amount: extra.price * extra.quantity * (extra.charge === "per_day" ? days : 1),
    }));
  const extrasTotal = extras.reduce((sum, line) => sum + line.amount, 0);
  const discount = input.coupon ? couponDiscount(input.coupon, rentalPrice) : 0;
  const beforeTax = rentalPrice - discount + extrasTotal + input.dropOffFee;
  const tax = Math.round((beforeTax * input.taxRate) / 10_000);

  return {
    days,
    usesWeeklyRate,
    rentalPrice,
    seasonNotes: [...seasonNotes],
    extras,
    extrasTotal,
    dropOffFee: input.dropOffFee,
    discount,
    tax,
    total: beforeTax + tax,
  };
}
