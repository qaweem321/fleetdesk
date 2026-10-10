import assert from "node:assert/strict";
import { test } from "node:test";
import {
  normalizePlate,
  parseBlockInput,
  parseCarModelInput,
  parseLocationInput,
  parseVehicleInput,
} from "./input";

const reader = (values: Record<string, string>) => (name: string) => (values[name] ?? "").trim();

test("locations need a name; address and phone are optional", () => {
  assert.deepEqual(parseLocationInput(reader({ name: " Airport " })), {
    values: { name: "Airport", address: null, phone: null },
  });
  assert.ok("error" in parseLocationInput(reader({ name: "" })));
  assert.ok("error" in parseLocationInput(reader({ name: "x".repeat(81) })));
});

const corolla = {
  make: "Toyota",
  model: "Corolla",
  carClass: "compact",
  transmission: "automatic",
  fuelType: "hybrid",
  seats: "5",
  doors: "4",
  bags: "2",
  description: "",
};

test("reads a car model", () => {
  const result = parseCarModelInput(reader(corolla));
  assert.ok("values" in result);
  assert.equal(result.values.seats, 5);
  assert.equal(result.values.description, null);
});

test("explains what's wrong with a car model", () => {
  const cases: [Record<string, string>, RegExp][] = [
    [{ make: "" }, /make and the model/],
    [{ carClass: "spaceship" }, /car class/],
    [{ transmission: "cvt" }, /automatic or manual/],
    [{ fuelType: "coal" }, /fuel type/],
    [{ seats: "0" }, /seats/],
    [{ bags: "two" }, /bags/],
  ];
  for (const [change, message] of cases) {
    const result = parseCarModelInput(reader({ ...corolla, ...change }));
    assert.ok("error" in result);
    assert.match(result.error, message);
  }
});

test("plates are saved in uppercase with single spaces", () => {
  assert.equal(normalizePlate("  ab-123   cd "), "AB-123 CD");
});

const vehicle = {
  carModelId: "6f1c2b0e-8a7d-4c3b-9e2f-1a2b3c4d5e6f",
  locationId: "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
  plate: "abc 123",
  vin: "",
  year: "2024",
  color: "White",
  mileage: "12500",
  status: "available",
  notes: "",
};

test("reads a vehicle", () => {
  const result = parseVehicleInput(reader(vehicle), 2026);
  assert.ok("values" in result);
  assert.deepEqual(result.values, {
    carModelId: vehicle.carModelId,
    locationId: vehicle.locationId,
    plate: "ABC 123",
    vin: null,
    year: 2024,
    color: "White",
    mileage: 12500,
    status: "available",
    notes: null,
  });
});

test("year and mileage are optional; empty mileage is 0", () => {
  const result = parseVehicleInput(reader({ ...vehicle, year: "", mileage: "" }), 2026);
  assert.ok("values" in result);
  assert.equal(result.values.year, null);
  assert.equal(result.values.mileage, 0);
});

test("explains what's wrong with a vehicle", () => {
  const cases: [Record<string, string>, RegExp][] = [
    [{ carModelId: "1" }, /car model/],
    [{ locationId: "" }, /where the car is/],
    [{ plate: "  " }, /number plate/],
    [{ year: "2030" }, /year between 1950 and 2027/],
    [{ mileage: "-5" }, /mileage/],
    [{ status: "stolen" }, /status/],
  ];
  for (const [change, message] of cases) {
    const result = parseVehicleInput(reader({ ...vehicle, ...change }), 2026);
    assert.ok("error" in result, String(message));
    assert.match(result.error, message);
  }
});

test("reads a blocked period in the business's time zone", () => {
  const result = parseBlockInput(
    reader({ startsAt: "2026-11-02T09:00", endsAt: "2026-11-03T17:00", reason: "Service" }),
    "Asia/Karachi",
  );
  assert.ok("values" in result);
  assert.equal(result.values.startsAt.toISOString(), "2026-11-02T04:00:00.000Z");
  assert.equal(result.values.endsAt.toISOString(), "2026-11-03T12:00:00.000Z");
});

test("a blocked period must end after it starts and have a reason", () => {
  const base = { startsAt: "2026-11-02T09:00", endsAt: "2026-11-03T17:00", reason: "Service" };
  const cases: [Record<string, string>, RegExp][] = [
    [{ startsAt: "" }, /starts and ends/],
    [{ endsAt: "2026-11-02T09:00" }, /after the start/],
    [{ reason: "" }, /reason/],
  ];
  for (const [change, message] of cases) {
    const result = parseBlockInput(reader({ ...base, ...change }), "UTC");
    assert.ok("error" in result);
    assert.match(result.error, message);
  }
});
