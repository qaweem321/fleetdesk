import assert from "node:assert/strict";
import { test } from "node:test";
import { parseBusinessInput } from "./business-input";

const valid: Record<string, string> = {
  businessName: "  City Car Rentals ",
  currency: "usd",
  timeZone: "America/New_York",
  distanceUnit: "mi",
  contactEmail: "Hello@CityCars.com",
  contactPhone: "+1 555 0100",
  address: "",
  brandColor: "#2563EB",
};

const reader = (values: Record<string, string>) => (name: string) => (values[name] ?? "").trim();

test("accepts and cleans up valid business details", () => {
  const result = parseBusinessInput(reader(valid));
  assert.ok("values" in result);
  assert.deepEqual(result.values, {
    businessName: "City Car Rentals",
    currency: "USD",
    timeZone: "America/New_York",
    distanceUnit: "mi",
    contactEmail: "hello@citycars.com",
    contactPhone: "+1 555 0100",
    address: null,
    brandColor: "#2563eb",
  });
});

test("explains what's wrong with invalid details", () => {
  const cases: [Record<string, string>, string][] = [
    [{ businessName: "" }, "business name"],
    [{ businessName: "x".repeat(81) }, "at most 80"],
    [{ currency: "ABC" }, "currency"],
    [{ timeZone: "Mars/Base" }, "time zone"],
    [{ distanceUnit: "leagues" }, "kilometers or miles"],
    [{ contactEmail: "not-an-email" }, "contact email"],
    [{ brandColor: "blue" }, "like #2563eb"],
  ];
  for (const [change, message] of cases) {
    const result = parseBusinessInput(reader({ ...valid, ...change }));
    assert.ok("error" in result, message);
    assert.match(result.error, new RegExp(message));
  }
});
