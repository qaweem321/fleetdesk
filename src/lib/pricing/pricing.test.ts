import assert from "node:assert/strict";
import { test } from "node:test";
import { couponDiscount, couponProblem, normalizeCouponCode } from "./coupon";
import { calculateQuote, type QuoteInput } from "./quote";
import { rentalDays } from "./rental-days";

const at = (iso: string) => new Date(iso);

test("every started 24 hours is a day, with a grace period", () => {
  const pickup = at("2026-10-10T10:00:00Z");
  assert.equal(rentalDays(pickup, at("2026-10-10T14:00:00Z"), 59), 1);
  assert.equal(rentalDays(pickup, at("2026-10-11T10:00:00Z"), 59), 1);
  assert.equal(rentalDays(pickup, at("2026-10-12T10:45:00Z"), 59), 2);
  assert.equal(rentalDays(pickup, at("2026-10-12T10:59:00Z"), 59), 2);
  assert.equal(rentalDays(pickup, at("2026-10-12T11:00:00Z"), 59), 3);
  assert.equal(rentalDays(pickup, at("2026-10-12T10:01:00Z"), 0), 3);
});

const base: QuoteInput = {
  start: at("2026-10-10T10:00:00Z"),
  end: at("2026-10-13T10:00:00Z"),
  timeZone: "UTC",
  graceMinutes: 59,
  rates: { dailyRate: 5000, weeklyRate: 28000 },
  seasons: [],
  extras: [],
  dropOffFee: 0,
  coupon: null,
  taxRate: 0,
};

test("short rentals use the daily price", () => {
  const quote = calculateQuote(base);
  assert.equal(quote.days, 3);
  assert.equal(quote.usesWeeklyRate, false);
  assert.equal(quote.rentalPrice, 15000);
  assert.equal(quote.total, 15000);
});

test("7 days or more use the weekly price, exactly", () => {
  const week = calculateQuote({ ...base, end: at("2026-10-17T10:00:00Z") });
  assert.equal(week.days, 7);
  assert.equal(week.usesWeeklyRate, true);
  assert.equal(week.rentalPrice, 28000);
  // 10 days: 10/7 of the weekly price.
  const tenDays = calculateQuote({ ...base, end: at("2026-10-20T10:00:00Z") });
  assert.equal(tenDays.rentalPrice, 40000);
});

test("without a weekly price, long rentals stay on the daily price", () => {
  const quote = calculateQuote({
    ...base,
    end: at("2026-10-17T10:00:00Z"),
    rates: { dailyRate: 5000, weeklyRate: null },
  });
  assert.equal(quote.usesWeeklyRate, false);
  assert.equal(quote.rentalPrice, 35000);
});

test("seasons change the price of the days they cover", () => {
  const quote = calculateQuote({
    ...base,
    seasons: [
      { name: "Peak", startsOn: "2026-10-11", endsOn: "2026-10-11", adjustmentPercent: 20 },
    ],
  });
  // Day 1 normal, day 2 +20%, day 3 normal.
  assert.equal(quote.rentalPrice, 5000 + 6000 + 5000);
  assert.deepEqual(quote.seasonNotes, ["Peak +20%"]);
});

test("a day's season follows the business's calendar, not UTC", () => {
  // 22:00 UTC on Oct 10 is already Oct 11 in Karachi (UTC+5).
  const quote = calculateQuote({
    ...base,
    start: at("2026-10-10T22:00:00Z"),
    end: at("2026-10-11T22:00:00Z"),
    timeZone: "Asia/Karachi",
    seasons: [
      { name: "Low", startsOn: "2026-10-11", endsOn: "2026-10-31", adjustmentPercent: -10 },
    ],
  });
  assert.equal(quote.rentalPrice, 4500);
});

test("extras are charged per day or once", () => {
  const quote = calculateQuote({
    ...base,
    extras: [
      { id: "seat", name: "Child seat", price: 800, charge: "per_day", quantity: 2 },
      { id: "clean", name: "Cleaning", price: 2500, charge: "per_rental", quantity: 1 },
      { id: "gps", name: "GPS", price: 500, charge: "per_day", quantity: 0 },
    ],
  });
  assert.deepEqual(
    quote.extras.map((line) => [line.id, line.amount]),
    [
      ["seat", 4800],
      ["clean", 2500],
    ],
  );
  assert.equal(quote.extrasTotal, 7300);
  assert.equal(quote.total, 22300);
});

test("coupons only discount the rental price; tax is added on the rest", () => {
  const quote = calculateQuote({
    ...base,
    extras: [{ id: "gps", name: "GPS", price: 1000, charge: "per_rental", quantity: 1 }],
    dropOffFee: 3000,
    coupon: { type: "percent", amount: 10 },
    taxRate: 825,
  });
  assert.equal(quote.discount, 1500);
  // (15000 - 1500 + 1000 + 3000) * 8.25% = 1443.75 -> 1444
  assert.equal(quote.tax, 1444);
  assert.equal(quote.total, 17500 + 1444);
});

test("a fixed coupon never makes the rental negative", () => {
  assert.equal(couponDiscount({ type: "fixed", amount: 2000 }, 15000), 2000);
  assert.equal(couponDiscount({ type: "fixed", amount: 99999 }, 15000), 15000);
  assert.equal(couponDiscount({ type: "percent", amount: 100 }, 15000), 15000);
});

const coupon = {
  type: "percent" as const,
  amount: 10,
  validFrom: "2026-10-01",
  validUntil: "2026-10-31",
  minDays: 3,
  maxUses: 5,
  timesUsed: 0,
  active: true,
};

test("coupons check their dates, uses and minimum days", () => {
  assert.equal(couponProblem(coupon, "2026-10-10", 3), null);
  assert.match(couponProblem(coupon, "2026-09-30", 3) ?? "", /isn't valid yet/);
  assert.match(couponProblem(coupon, "2026-11-01", 3) ?? "", /expired/);
  assert.match(couponProblem(coupon, "2026-10-10", 2) ?? "", /3 days or more/);
  assert.match(couponProblem({ ...coupon, timesUsed: 5 }, "2026-10-10", 3) ?? "", /used up/);
  assert.match(
    couponProblem({ ...coupon, active: false }, "2026-10-10", 3) ?? "",
    /no longer valid/,
  );
  assert.equal(
    couponProblem(
      { ...coupon, validFrom: null, validUntil: null, minDays: null, maxUses: null },
      "2030-01-01",
      1,
    ),
    null,
  );
});

test("coupon codes are case-insensitive", () => {
  assert.equal(normalizeCouponCode(" summer-10 "), "SUMMER-10");
});
