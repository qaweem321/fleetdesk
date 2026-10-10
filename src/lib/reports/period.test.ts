import assert from "node:assert/strict";
import { test } from "node:test";
import { resolvePeriod, today, utilizationPercent } from "./period";

const now = new Date("2026-10-10T20:00:00Z");

test("today runs from midnight to midnight at the business", () => {
  // 20:00 UTC is already Oct 11 in Karachi (UTC+5).
  const period = today("Asia/Karachi", now);
  assert.equal(period.from.toISOString(), "2026-10-10T19:00:00.000Z");
  assert.equal(period.to.toISOString(), "2026-10-11T19:00:00.000Z");
});

test("this month and last month follow the business's calendar", () => {
  const month = resolvePeriod("month", "UTC", now);
  assert.equal(month.from.toISOString(), "2026-10-01T00:00:00.000Z");
  assert.equal(month.to, now);
  const last = resolvePeriod("last_month", "UTC", now);
  assert.equal(last.from.toISOString(), "2026-09-01T00:00:00.000Z");
  assert.equal(last.to.toISOString(), "2026-10-01T00:00:00.000Z");
});

test("the last 30 days end now", () => {
  const period = resolvePeriod("30d", "UTC", now);
  assert.equal(period.from.toISOString(), "2026-09-10T20:00:00.000Z");
});

test("utilization is the rented share of the time cars were there", () => {
  const period = { from: new Date(0), to: new Date(10 * 86_400_000), label: "" };
  assert.equal(utilizationPercent(5 * 86_400_000, 1, period), 50);
  assert.equal(utilizationPercent(5 * 86_400_000, 2, period), 25);
  assert.equal(utilizationPercent(0, 0, period), 0);
});
