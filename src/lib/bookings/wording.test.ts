import assert from "node:assert/strict";
import { test } from "node:test";
import { paymentSentence } from "./wording";

const booking = {
  status: "confirmed" as const,
  paymentMethod: "pay_at_pickup" as const,
  total: 20063,
  currency: "USD",
  paid: 0,
  refunded: 0,
};

test("pay at pickup, nothing paid yet", () => {
  assert.equal(paymentSentence(booking), "You pay $200.63 at pickup.");
});

test("paid online in full", () => {
  assert.equal(
    paymentSentence({ ...booking, paymentMethod: "online", paid: 20063 }),
    "Paid online: $200.63.",
  );
});

test("waiting for the online payment", () => {
  assert.match(
    paymentSentence({ ...booking, status: "pending_payment", paymentMethod: "online" }),
    /^Waiting for your online payment of \$200\.63\./,
  );
});

test("partly paid", () => {
  assert.equal(paymentSentence({ ...booking, paid: 5000 }), "Paid $50.00. Still to pay: $150.63.");
});

test("paid at the counter", () => {
  assert.equal(paymentSentence({ ...booking, status: "active", paid: 20063 }), "Paid: $200.63.");
});

test("cancelled: refunded, not refunded, or nothing paid", () => {
  assert.match(
    paymentSentence({
      ...booking,
      status: "cancelled",
      paymentMethod: "online",
      paid: 0,
      refunded: 20063,
    }),
    /^\$200\.63 has been refunded to your card\./,
  );
  assert.equal(
    paymentSentence({ ...booking, status: "cancelled", paid: 5000 }),
    "$50.00 was paid and has not been refunded.",
  );
  assert.equal(paymentSentence({ ...booking, status: "cancelled" }), "Nothing was charged.");
});

test("never says 'at pickup' once the car is out", () => {
  assert.equal(paymentSentence({ ...booking, status: "active" }), "Still to pay: $200.63.");
});
