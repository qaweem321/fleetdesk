import assert from "node:assert/strict";
import { test } from "node:test";
import {
  fromLocalInput,
  isValidTimeZone,
  localDateKey,
  parseDateKey,
  toLocalInput,
} from "./time-zone";

test("reads a wall-clock time at the business as the right UTC moment", () => {
  assert.equal(
    fromLocalInput("2026-10-11T10:00", "UTC")?.toISOString(),
    "2026-10-11T10:00:00.000Z",
  );
  assert.equal(
    fromLocalInput("2026-10-11T10:00", "Asia/Karachi")?.toISOString(),
    "2026-10-11T05:00:00.000Z",
  );
  // New York is UTC-4 in summer and UTC-5 in winter.
  assert.equal(
    fromLocalInput("2026-07-01T09:00", "America/New_York")?.toISOString(),
    "2026-07-01T13:00:00.000Z",
  );
  assert.equal(
    fromLocalInput("2026-12-01T09:00", "America/New_York")?.toISOString(),
    "2026-12-01T14:00:00.000Z",
  );
});

test("handles the day daylight saving starts", () => {
  // Berlin moves from UTC+1 to UTC+2 at 02:00 on Mar 29, 2026.
  assert.equal(
    fromLocalInput("2026-03-29T12:00", "Europe/Berlin")?.toISOString(),
    "2026-03-29T10:00:00.000Z",
  );
  assert.equal(
    fromLocalInput("2026-03-29T01:00", "Europe/Berlin")?.toISOString(),
    "2026-03-29T00:00:00.000Z",
  );
});

test("rejects text that isn't a real date and time", () => {
  assert.equal(fromLocalInput("", "UTC"), null);
  assert.equal(fromLocalInput("2026-02-30T10:00", "UTC"), null);
  assert.equal(fromLocalInput("2026-10-11T24:00", "UTC"), null);
  assert.equal(fromLocalInput("2026-10-11 10:00", "UTC"), null);
});

test("writes a UTC moment as the wall-clock time at the business", () => {
  const moment = new Date("2026-10-11T23:30:00Z");
  assert.equal(toLocalInput(moment, "UTC"), "2026-10-11T23:30");
  assert.equal(toLocalInput(moment, "Asia/Karachi"), "2026-10-12T04:30");
  assert.equal(localDateKey(moment, "Asia/Karachi"), "2026-10-12");
});

test("round-trips through the input format", () => {
  for (const zone of ["UTC", "Europe/Berlin", "America/Los_Angeles", "Asia/Kolkata"]) {
    const value = "2026-11-01T08:15";
    const moment = fromLocalInput(value, zone);
    assert.ok(moment);
    assert.equal(toLocalInput(moment, zone), value, zone);
  }
});

test("knows real time zones", () => {
  assert.equal(isValidTimeZone("Europe/Berlin"), true);
  assert.equal(isValidTimeZone("Mars/Olympus"), false);
});

test("dates must be real calendar dates", () => {
  assert.equal(parseDateKey("2026-02-28"), "2026-02-28");
  assert.equal(parseDateKey("2026-02-30"), null);
  assert.equal(parseDateKey("28/02/2026"), null);
});
