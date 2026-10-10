import assert from "node:assert/strict";
import { test } from "node:test";
import { fuelLabel, suggestReturnCharges } from "./charges";

const base = {
  booking: {
    pickupAt: new Date("2026-11-02T10:00:00Z"),
    returnAt: new Date("2026-11-05T10:00:00Z"),
    days: 3,
    rentalPrice: 15000,
    currency: "USD",
  },
  model: { includedDistancePerDay: 200, extraDistanceFee: 25 },
  pickup: { mileage: 10000, fuelLevel: 8 },
  back: { mileage: 10500, fuelLevel: 8, at: new Date("2026-11-05T10:30:00Z") },
  settings: { graceMinutes: 59, fuelChargePerEighth: 1200, distanceUnit: "km" as const },
};

test("an on-time return with a full tank and few km costs nothing extra", () => {
  assert.deepEqual(suggestReturnCharges(base), []);
});

test("charges the distance over what was included", () => {
  const lines = suggestReturnCharges({ ...base, back: { ...base.back, mileage: 10750 } });
  assert.deepEqual(lines, [
    {
      kind: "extra_distance",
      description: "150 km over the 600 km included ($0.25 per km)",
      amount: 3750,
    },
  ]);
});

test("unlimited distance is never charged", () => {
  const lines = suggestReturnCharges({
    ...base,
    model: { includedDistancePerDay: null, extraDistanceFee: 25 },
    back: { ...base.back, mileage: 99999 },
  });
  assert.deepEqual(lines, []);
});

test("charges the missing fuel per eighth, only when a fuel price is set", () => {
  const back = { ...base.back, fuelLevel: 5 };
  assert.deepEqual(suggestReturnCharges({ ...base, back }), [
    { kind: "fuel", description: "Fuel: 3/8 of a tank less than at pickup", amount: 3600 },
  ]);
  assert.deepEqual(
    suggestReturnCharges({ ...base, back, settings: { ...base.settings, fuelChargePerEighth: 0 } }),
    [],
  );
});

test("a late return costs the extra days, after the grace period", () => {
  const lines = suggestReturnCharges({
    ...base,
    back: { ...base.back, at: new Date("2026-11-05T12:00:00Z") },
  });
  assert.deepEqual(lines, [
    { kind: "late_return", description: "Returned late: 1 extra day at $50.00", amount: 5000 },
  ]);
});

test("an early return is not refunded automatically", () => {
  const lines = suggestReturnCharges({
    ...base,
    back: { ...base.back, at: new Date("2026-11-04T10:00:00Z") },
  });
  assert.deepEqual(lines, []);
});

test("fuel levels read like a fuel gauge", () => {
  assert.equal(fuelLabel(8), "Full");
  assert.equal(fuelLabel(4), "1/2");
  assert.equal(fuelLabel(6), "3/4");
  assert.equal(fuelLabel(3), "3/8");
  assert.equal(fuelLabel(0), "Empty");
});
