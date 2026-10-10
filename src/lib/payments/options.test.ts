import assert from "node:assert/strict";
import { test } from "node:test";
import { CHECKOUT_MINUTES, HOLD_MINUTES, paymentMethodsFor } from "./options";

const withStripe = { STRIPE_SECRET_KEY: "sk_test_123" };

test("without Stripe, customers always pay at pickup", () => {
  for (const option of ["pay_at_pickup", "online", "both"] as const) {
    assert.deepEqual(paymentMethodsFor(option, {}), ["pay_at_pickup"], option);
  }
});

test("with Stripe, Settings decide", () => {
  assert.deepEqual(paymentMethodsFor("pay_at_pickup", withStripe), ["pay_at_pickup"]);
  assert.deepEqual(paymentMethodsFor("online", withStripe), ["online"]);
  assert.deepEqual(paymentMethodsFor("both", withStripe), ["online", "pay_at_pickup"]);
});

test("the car is held longer than the checkout page stays open", () => {
  assert.ok(HOLD_MINUTES > CHECKOUT_MINUTES);
  assert.ok(CHECKOUT_MINUTES >= 30);
});
