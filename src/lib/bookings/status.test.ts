import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cancellationDeadline,
  cancellationNote,
  customerCanCancel,
  makeReference,
  staffCanCancel,
} from "./status";

const pickupAt = new Date("2026-11-02T10:00:00Z");

test("customers can cancel until the free cancellation deadline", () => {
  const booking = { status: "confirmed" as const, pickupAt };
  assert.equal(customerCanCancel(booking, 24, new Date("2026-11-01T09:59:00Z")), true);
  assert.equal(customerCanCancel(booking, 24, new Date("2026-11-01T10:00:00Z")), true);
  assert.equal(customerCanCancel(booking, 24, new Date("2026-11-01T10:01:00Z")), false);
  assert.equal(cancellationDeadline(pickupAt, 24).toISOString(), "2026-11-01T10:00:00.000Z");
});

test("only bookings that haven't started can be cancelled", () => {
  const early = new Date("2026-10-01T00:00:00Z");
  for (const status of ["active", "completed", "cancelled"] as const) {
    assert.equal(customerCanCancel({ status, pickupAt }, 24, early), false, status);
    assert.equal(staffCanCancel({ status }), false, status);
  }
  assert.equal(staffCanCancel({ status: "confirmed" }), true);
  assert.equal(customerCanCancel({ status: "pending_payment", pickupAt }, 24, early), true);
});

test("references are 6 easy-to-read characters", () => {
  const reference = makeReference(new Uint8Array([0, 1, 2, 30, 31, 255]));
  assert.equal(reference.length, 6);
  assert.match(reference, /^[A-HJKMNP-Z2-9]{6}$/);
  assert.equal(makeReference(new Uint8Array([0, 0, 0, 0, 0, 0])), "AAAAAA");
});

test("the cancellation note never points to a deadline in the past", () => {
  const show = (date: Date) => date.toISOString();
  assert.equal(
    cancellationNote(pickupAt, 24, show, new Date("2026-10-30T10:00:00Z")),
    "Free cancellation online until 2026-11-01T10:00:00.000Z.",
  );
  assert.match(
    cancellationNote(pickupAt, 24, show, new Date("2026-11-01T12:00:00Z")),
    /no longer be cancelled online/,
  );
});
