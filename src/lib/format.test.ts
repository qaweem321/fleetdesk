import assert from "node:assert/strict";
import { test } from "node:test";
import { endSentence, formatDate, formatDateTime, formatTime } from "./format";

test("formats dates with the month name, in UTC by default", () => {
  assert.equal(formatDate(new Date("2026-10-11T12:00:00Z")), "Oct 11, 2026");
  assert.equal(formatDate(new Date("2026-01-01T00:30:00Z")), "Jan 1, 2026");
});

test("formats dates and times in the business's time zone", () => {
  const lateEvening = new Date("2026-10-11T23:30:00Z");
  assert.equal(formatDate(lateEvening, "Asia/Karachi"), "Oct 12, 2026");
  assert.equal(formatDateTime(lateEvening, "Asia/Karachi"), "Oct 12, 2026, 4:30 AM");
  assert.equal(formatTime(lateEvening, "America/New_York"), "7:30 PM");
});

test("ends a sentence without doubling the full stop", () => {
  assert.equal(endSentence("Acme"), "Acme.");
  assert.equal(endSentence("Acme Inc."), "Acme Inc.");
  assert.equal(endSentence("Yay!"), "Yay!");
});
