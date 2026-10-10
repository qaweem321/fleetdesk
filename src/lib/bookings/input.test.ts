import assert from "node:assert/strict";
import { test } from "node:test";
import { isValidPhone, parseBookingDetails } from "./input";

const reader = (values: Record<string, string>) => (name: string) => (values[name] ?? "").trim();

test("accepts common phone formats", () => {
  for (const phone of ["+1 (555) 010-0100", "0300 1234567", "+44 20 7946 0958", "5550100"]) {
    assert.equal(isValidPhone(phone), true, phone);
  }
});

test("refuses things that aren't phone numbers", () => {
  for (const phone of ["", "12345", "call me", "+1 555 010 0100 ext 5 please", "-----------"]) {
    assert.equal(isValidPhone(phone), false, phone);
  }
});

test("reads the booking details", () => {
  assert.deepEqual(parseBookingDetails(reader({ phone: " +1 555 0100 ", note: "" })), {
    values: { phone: "+1 555 0100", note: null },
  });
  const result = parseBookingDetails(reader({ phone: "nope" }));
  assert.ok("error" in result);
  assert.match(result.error, /phone number/);
  assert.ok("error" in parseBookingDetails(reader({ phone: "5550100", note: "x".repeat(501) })));
});
