import assert from "node:assert/strict";
import { test } from "node:test";
import { ageOn, driverAgeProblem, driverReadinessProblems, parseDriverInput } from "./rules";

test("counts whole years, turning older on the birthday itself", () => {
  assert.equal(ageOn("2000-05-17", "2025-05-16"), 24);
  assert.equal(ageOn("2000-05-17", "2025-05-17"), 25);
  assert.equal(ageOn("2000-05-17", "2025-12-01"), 25);
  // Born on February 29.
  assert.equal(ageOn("2004-02-29", "2025-02-28"), 20);
  assert.equal(ageOn("2004-02-29", "2025-03-01"), 21);
});

test("checks the minimum age on the pickup date", () => {
  assert.equal(driverAgeProblem("2005-06-01", "2026-06-01", 21), null);
  assert.match(driverAgeProblem("2005-06-02", "2026-06-01", 21) ?? "", /at least 21/);
  assert.match(driverAgeProblem(null, "2026-06-01", 21) ?? "", /date of birth/);
});

const ready = {
  status: "approved" as const,
  dateOfBirth: "1990-01-01",
  licenseExpiresOn: "2030-01-01",
  reviewNote: null,
};
const rental = { pickupDate: "2026-11-02", returnDate: "2026-11-05", minAge: 21 };

test("an approved, adult driver with a valid license is ready", () => {
  assert.deepEqual(driverReadinessProblems(ready, rental), []);
});

test("says what's missing before the keys can be handed over", () => {
  assert.deepEqual(driverReadinessProblems(null, rental), [
    "The driver's license hasn't been sent yet.",
    "Please enter the driver's date of birth.",
  ]);
  assert.deepEqual(driverReadinessProblems({ ...ready, status: "pending" }, rental), [
    "The driver's license is waiting to be checked.",
  ]);
  assert.deepEqual(
    driverReadinessProblems(
      { ...ready, status: "rejected", reviewNote: "Photo is blurry" },
      rental,
    ),
    ["The driver's license was not accepted: Photo is blurry"],
  );
  assert.deepEqual(driverReadinessProblems({ ...ready, licenseExpiresOn: "2026-11-04" }, rental), [
    "The driver's license expires before the return date.",
  ]);
});

const reader = (values: Record<string, string>) => (name: string) => (values[name] ?? "").trim();
const today = "2026-10-10";
const valid = {
  dateOfBirth: "1990-05-17",
  licenseNumber: "d123-456",
  licenseCountry: "United States",
  licenseExpiresOn: "2029-05-17",
};

test("reads driver details", () => {
  assert.deepEqual(parseDriverInput(reader(valid), today), {
    values: { ...valid, licenseNumber: "D123-456" },
  });
});

test("explains what's wrong with driver details", () => {
  const cases: [Record<string, string>, RegExp][] = [
    [{ dateOfBirth: "" }, /date of birth/],
    [{ dateOfBirth: "2030-01-01" }, /date of birth/],
    [{ dateOfBirth: "2015-01-01" }, /old enough/],
    [{ licenseNumber: "" }, /license number/],
    [{ licenseCountry: "" }, /country/],
    [{ licenseExpiresOn: "2026-10-09" }, /expired/],
  ];
  for (const [change, message] of cases) {
    const result = parseDriverInput(reader({ ...valid, ...change }), today);
    assert.ok("error" in result, String(message));
    assert.match(result.error, message);
  }
});
