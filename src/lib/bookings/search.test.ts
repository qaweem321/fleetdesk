import assert from "node:assert/strict";
import { test } from "node:test";
import { bookingRuleProblem } from "./rules";
import { defaultSearchTimes, readSearch, searchParamsOf, TIME_OPTIONS } from "./search";

const airport = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
const downtown = "1a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";

test("a plain visit has no search", () => {
  assert.equal(readSearch({}, "UTC"), null);
});

test("reads the search from the form's date and time fields", () => {
  const result = readSearch(
    {
      pickupLocationId: airport,
      pickupDate: "2026-11-02",
      pickupTime: "10:00",
      returnDate: "2026-11-05",
      returnTime: "09:30",
    },
    "UTC",
  );
  assert.ok(result && "start" in result);
  assert.equal(result.start.toISOString(), "2026-11-02T10:00:00.000Z");
  assert.equal(result.end.toISOString(), "2026-11-05T09:30:00.000Z");
  assert.equal(result.query.returnLocationId, airport);
});

test("reads the combined form used in links, with a one-way return", () => {
  const result = readSearch(
    {
      pickupLocationId: airport,
      returnLocationId: downtown,
      pickupAt: "2026-11-02T10:00",
      returnAt: "2026-11-05T10:00",
    },
    "Asia/Karachi",
  );
  assert.ok(result && "start" in result);
  assert.equal(result.start.toISOString(), "2026-11-02T05:00:00.000Z");
  assert.equal(result.query.returnLocationId, downtown);
});

test("explains an incomplete search", () => {
  const noPlace = readSearch({ pickupAt: "2026-11-02T10:00" }, "UTC");
  assert.ok(noPlace && "error" in noPlace);
  assert.match(noPlace.error, /pick up the car/);
  const noDates = readSearch({ pickupLocationId: airport, pickupDate: "2026-11-02" }, "UTC");
  assert.ok(noDates && "error" in noDates);
  assert.match(noDates.error, /dates and times/);
});

test("links carry the search, leaving out a same-place return", () => {
  const query = {
    pickupLocationId: airport,
    returnLocationId: airport,
    pickupAt: "2026-11-02T10:00",
    returnAt: "2026-11-05T10:00",
  };
  assert.equal(
    searchParamsOf(query),
    `pickupLocationId=${airport}&pickupAt=2026-11-02T10%3A00&returnAt=2026-11-05T10%3A00`,
  );
  assert.match(searchParamsOf({ ...query, returnLocationId: downtown }), /returnLocationId=/);
});

test("suggests tomorrow to three days later, at 10:00 local time", () => {
  assert.deepEqual(defaultSearchTimes("UTC", new Date("2026-10-10T20:00:00Z")), {
    pickupAt: "2026-10-11T10:00",
    returnAt: "2026-10-14T10:00",
  });
});

test("offers every half hour", () => {
  assert.equal(TIME_OPTIONS.length, 48);
  assert.equal(TIME_OPTIONS[0], "00:00");
  assert.equal(TIME_OPTIONS[21], "10:30");
  assert.equal(TIME_OPTIONS[47], "23:30");
});

const rules = { minLeadHours: 2, maxRentalDays: 30, graceMinutes: 59 };
const now = new Date("2026-10-10T08:00:00Z");

test("checks the booking rules", () => {
  const at = (iso: string) => new Date(iso);
  assert.equal(
    bookingRuleProblem(at("2026-10-11T10:00:00Z"), at("2026-10-14T10:00:00Z"), rules, now),
    null,
  );
  assert.match(
    bookingRuleProblem(at("2026-10-11T10:00:00Z"), at("2026-10-11T09:00:00Z"), rules, now) ?? "",
    /after the pickup/,
  );
  assert.match(
    bookingRuleProblem(at("2026-10-10T09:00:00Z"), at("2026-10-12T09:00:00Z"), rules, now) ?? "",
    /2 hours' notice/,
  );
  assert.match(
    bookingRuleProblem(at("2026-10-11T10:00:00Z"), at("2026-11-11T10:00:00Z"), rules, now) ?? "",
    /at most 30 days/,
  );
  assert.match(
    bookingRuleProblem(
      at("2026-10-10T07:00:00Z"),
      at("2026-10-12T09:00:00Z"),
      { ...rules, minLeadHours: 0 },
      now,
    ) ?? "",
    /already passed/,
  );
});
