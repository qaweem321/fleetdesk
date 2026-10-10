import assert from "node:assert/strict";
import { test } from "node:test";
import { buildAgreementText, DEFAULT_AGREEMENT_TERMS } from "./agreement";

const facts = {
  businessName: "Sunrise Car Rental",
  businessAddress: "120 Ocean Drive, Miami, FL",
  reference: "K7M3QX",
  customerName: "Chris Customer",
  customerEmail: "chris@example.com",
  customerPhone: "+1 555 0123",
  car: "Toyota Corolla",
  plate: "FLA 2001",
  pickupAt: new Date("2026-11-02T14:00:00Z"),
  returnAt: new Date("2026-11-05T14:00:00Z"),
  pickupLocation: "Miami Airport (MIA)",
  returnLocation: "Downtown Miami",
  mileage: 12500,
  fuelLevel: 8,
  distanceUnit: "mi",
  total: 20063,
  depositAmount: 25000,
  currency: "USD",
  timeZone: "America/New_York",
  terms: null,
};

test("the agreement lists the rental facts in the business's time zone", () => {
  const text = buildAgreementText(facts);
  assert.match(text, /^RENTAL AGREEMENT K7M3QX/);
  assert.match(text, /Vehicle: Toyota Corolla, plate FLA 2001/);
  assert.match(text, /Pickup: Nov 2, 2026, 9:00\sAM, Miami Airport \(MIA\)/);
  assert.match(text, /At pickup: 12,500 mi, fuel Full/);
  assert.match(text, /Rental price: \$200\.63/);
  assert.match(text, /Deposit: \$250\.00/);
});

test("uses the business's own terms, or the template", () => {
  assert.ok(buildAgreementText(facts).endsWith(DEFAULT_AGREEMENT_TERMS));
  assert.ok(
    buildAgreementText({ ...facts, terms: "  No racing.  " }).endsWith("TERMS\nNo racing."),
  );
});

test("leaves out the deposit line when there's no deposit", () => {
  assert.doesNotMatch(buildAgreementText({ ...facts, depositAmount: 0 }), /Deposit:/);
});
