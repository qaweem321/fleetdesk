import assert from "node:assert/strict";
import { test } from "node:test";
import { parseQuoteRequest } from "./request";

const model = "6f1c2b0e-8a7d-4c3b-9e2f-1a2b3c4d5e6f";
const airport = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
const downtown = "1a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
const seat = "2a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";

const fields = (values: Record<string, string>) => Object.entries(values);

const complete = {
  carModelId: model,
  pickupLocationId: airport,
  returnLocationId: downtown,
  pickupAt: "2026-11-02T10:00",
  returnAt: "2026-11-05T10:00",
  coupon: " summer ",
  [`extra_${seat}`]: "2",
};

test("reads a complete request in the business's time zone", () => {
  const result = parseQuoteRequest(fields(complete), "Asia/Karachi");
  assert.ok("request" in result);
  assert.equal(result.request.start.toISOString(), "2026-11-02T05:00:00.000Z");
  assert.equal(result.request.returnLocationId, downtown);
  assert.equal(result.request.couponCode, "summer");
  assert.deepEqual([...result.request.extras], [[seat, 2]]);
});

test("returning to the pickup location is the default", () => {
  const result = parseQuoteRequest(fields({ ...complete, returnLocationId: "" }), "UTC");
  assert.ok("request" in result);
  assert.equal(result.request.returnLocationId, airport);
});

test("ignores extras with bad ids or quantities", () => {
  const result = parseQuoteRequest(
    fields({ ...complete, [`extra_${seat}`]: "-1", extra_nope: "3", [`extra_${model}`]: "abc" }),
    "UTC",
  );
  assert.ok("request" in result);
  assert.equal(result.request.extras.size, 0);
});

test("explains what's missing", () => {
  const cases: [Record<string, string>, RegExp][] = [
    [{ carModelId: "x" }, /choose a car/],
    [{ pickupLocationId: "" }, /pick up and return/],
    [{ returnAt: "tomorrow" }, /date and time/],
  ];
  for (const [change, message] of cases) {
    const result = parseQuoteRequest(fields({ ...complete, ...change }), "UTC");
    assert.ok("error" in result);
    assert.match(result.error, message);
  }
});
