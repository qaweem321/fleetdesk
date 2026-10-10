import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseCouponInput,
  parseDateKey,
  parseExtraInput,
  parseRulesInput,
  parseSeasonInput,
  parseTaxRate,
  taxRateText,
} from "./input";

const reader = (values: Record<string, string>) => (name: string) => (values[name] ?? "").trim();

function expectError(result: { error: string } | { values: unknown }, message: RegExp) {
  assert.ok("error" in result, String(message));
  assert.match(result.error, message);
}

test("dates must be real calendar dates", () => {
  assert.equal(parseDateKey("2026-02-28"), "2026-02-28");
  assert.equal(parseDateKey("2026-02-30"), null);
  assert.equal(parseDateKey("28/02/2026"), null);
});

test("reads a season with a price change up or down", () => {
  const summer = {
    name: "Summer",
    startsOn: "2026-06-01",
    endsOn: "2026-08-31",
    adjustmentPercent: "+20",
  };
  assert.deepEqual(parseSeasonInput(reader(summer)), {
    values: { name: "Summer", startsOn: "2026-06-01", endsOn: "2026-08-31", adjustmentPercent: 20 },
  });
  const low = parseSeasonInput(reader({ ...summer, adjustmentPercent: "-15" }));
  assert.ok("values" in low);
  assert.equal(low.values.adjustmentPercent, -15);
  expectError(
    parseSeasonInput(reader({ ...summer, endsOn: "2026-05-01" })),
    /before the first day/,
  );
  expectError(parseSeasonInput(reader({ ...summer, adjustmentPercent: "0" })), /price change/);
  expectError(parseSeasonInput(reader({ ...summer, adjustmentPercent: "-95" })), /price change/);
  expectError(parseSeasonInput(reader({ ...summer, name: "" })), /name the season/);
});

test("reads an extra", () => {
  const seat = { name: "Child seat", price: "8", charge: "per_day", maxQuantity: "3" };
  assert.deepEqual(parseExtraInput(reader(seat), "USD"), {
    values: {
      name: "Child seat",
      description: null,
      price: 800,
      charge: "per_day",
      maxQuantity: 3,
    },
  });
  expectError(parseExtraInput(reader({ ...seat, charge: "weekly" }), "USD"), /per day or once/);
  expectError(parseExtraInput(reader({ ...seat, price: "" }), "USD"), /price/);
  expectError(parseExtraInput(reader({ ...seat, maxQuantity: "11" }), "USD"), /between 1 and 10/);
});

test("reads coupons in percent or a fixed amount", () => {
  const percent = parseCouponInput(
    reader({ code: " summer-10 ", type: "percent", amount: "10" }),
    "USD",
  );
  assert.deepEqual(percent, {
    values: {
      code: "SUMMER-10",
      type: "percent",
      amount: 10,
      validFrom: null,
      validUntil: null,
      minDays: null,
      maxUses: null,
    },
  });
  const fixed = parseCouponInput(
    reader({ code: "WELCOME", type: "fixed", amount: "20", minDays: "3", maxUses: "100" }),
    "USD",
  );
  assert.ok("values" in fixed);
  assert.equal(fixed.values.amount, 2000);
  assert.equal(fixed.values.minDays, 3);
});

test("explains what's wrong with a coupon", () => {
  const base = { code: "SAVE", type: "percent", amount: "10" };
  expectError(
    parseCouponInput(reader({ ...base, code: "a b" }), "USD"),
    /letters, numbers or dashes/,
  );
  expectError(parseCouponInput(reader({ ...base, amount: "150" }), "USD"), /1 to 100/);
  expectError(
    parseCouponInput(reader({ ...base, type: "fixed", amount: "x" }), "USD"),
    /discount amount/,
  );
  expectError(
    parseCouponInput(reader({ ...base, validFrom: "2026-10-10", validUntil: "2026-10-01" }), "USD"),
    /before it starts/,
  );
  expectError(parseCouponInput(reader({ ...base, maxUses: "0" }), "USD"), /number of uses/);
});

test("tax rates are read in hundredths of a percent", () => {
  assert.equal(parseTaxRate("8.25"), 825);
  assert.equal(parseTaxRate("20"), 2000);
  assert.equal(parseTaxRate("0"), 0);
  assert.equal(parseTaxRate("100"), 10000);
  assert.equal(parseTaxRate("101"), null);
  assert.equal(parseTaxRate("8.255"), null);
  assert.equal(taxRateText(825), "8.25");
  assert.equal(taxRateText(2000), "20");
  assert.equal(taxRateText(850), "8.5");
});

test("reads the booking rules", () => {
  const rules = {
    taxRate: "7",
    taxName: "Sales tax",
    graceMinutes: "59",
    minLeadHours: "2",
    maxRentalDays: "30",
    turnaroundMinutes: "60",
    freeCancellationHours: "24",
  };
  assert.deepEqual(parseRulesInput(reader(rules)), {
    values: {
      taxRate: 700,
      taxName: "Sales tax",
      graceMinutes: 59,
      minLeadHours: 2,
      maxRentalDays: 30,
      turnaroundMinutes: 60,
      freeCancellationHours: 24,
    },
  });
  expectError(parseRulesInput(reader({ ...rules, maxRentalDays: "0" })), /longest rental/);
  expectError(parseRulesInput(reader({ ...rules, taxRate: "abc" })), /tax rate/);
  expectError(parseRulesInput(reader({ ...rules, turnaroundMinutes: "" })), /cleaning time/);
  expectError(
    parseRulesInput(reader({ ...rules, freeCancellationHours: "x" })),
    /Free cancellation/,
  );
});
