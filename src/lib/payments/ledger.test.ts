import assert from "node:assert/strict";
import { test } from "node:test";
import { summarizePayments } from "./ledger";

test("nothing recorded: the whole total is due", () => {
  assert.deepEqual(summarizePayments([], 20000), {
    paid: 0,
    refunded: 0,
    depositHeld: 0,
    due: 20000,
  });
});

test("a full online payment leaves nothing due", () => {
  const ledger = summarizePayments([{ kind: "payment", amount: 20000 }], 20000);
  assert.equal(ledger.paid, 20000);
  assert.equal(ledger.due, 0);
});

test("a refund lowers what was paid", () => {
  const ledger = summarizePayments(
    [
      { kind: "payment", amount: 20000 },
      { kind: "refund", amount: 20000 },
    ],
    20000,
  );
  assert.equal(ledger.paid, 0);
  assert.equal(ledger.refunded, 20000);
});

test("a held deposit is not money received", () => {
  const ledger = summarizePayments(
    [
      { kind: "payment", amount: 20000 },
      { kind: "deposit_hold", amount: 30000 },
    ],
    20000,
  );
  assert.equal(ledger.paid, 20000);
  assert.equal(ledger.depositHeld, 30000);
});

test("charging part of the deposit ends the hold", () => {
  const ledger = summarizePayments(
    [
      { kind: "deposit_hold", amount: 30000 },
      { kind: "deposit_capture", amount: 4500 },
    ],
    0,
  );
  assert.equal(ledger.paid, 4500);
  assert.equal(ledger.depositHeld, 0);
});

test("a released deposit is no longer held", () => {
  const ledger = summarizePayments(
    [
      { kind: "deposit_hold", amount: 30000 },
      { kind: "deposit_release", amount: 30000 },
    ],
    0,
  );
  assert.equal(ledger.depositHeld, 0);
  assert.equal(ledger.paid, 0);
});

test("paying more than the total never shows a negative amount due", () => {
  assert.equal(summarizePayments([{ kind: "payment", amount: 25000 }], 20000).due, 0);
});
