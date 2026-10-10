import { fromLocalInput, localDateKey } from "@/lib/time-zone";
import { firstParam, type RawSearchParams } from "@/lib/url-params";
import { isUuid } from "@/lib/uuid";

// A search for cars, as it travels in the web address (?pickupLocationId=...&pickupAt=...),
// so results can be shared, bookmarked and opened again. Times are wall-clock times at the
// business, like "2026-11-02T10:00".
export type SearchQuery = {
  pickupLocationId: string;
  returnLocationId: string;
  pickupAt: string;
  returnAt: string;
};

export type ParsedSearch = { query: SearchQuery; start: Date; end: Date };

// Every half hour, "00:00" to "23:30", for the time pickers.
export const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hours = String(Math.floor(index / 2)).padStart(2, "0");
  return `${hours}:${index % 2 === 0 ? "00" : "30"}`;
});

// "2026-11-02T10:00" from either one field (pickupAt) or the date and time fields of the
// search form (pickupDate + pickupTime), which work without JavaScript.
function readTime(params: RawSearchParams, prefix: "pickup" | "return") {
  const combined = firstParam(params[`${prefix}At`]);
  if (combined) {
    return combined;
  }
  const date = firstParam(params[`${prefix}Date`]) ?? "";
  const time = firstParam(params[`${prefix}Time`]) ?? "";
  return date && time ? `${date}T${time}` : "";
}

// Null when the address has no search in it (a plain visit to /cars).
export function readSearch(
  params: RawSearchParams,
  timeZone: string,
): ParsedSearch | { error: string; query: Partial<SearchQuery> } | null {
  const pickupLocationId = firstParam(params.pickupLocationId) ?? "";
  const returnLocationId = firstParam(params.returnLocationId) || pickupLocationId;
  const pickupAt = readTime(params, "pickup");
  const returnAt = readTime(params, "return");
  if (!pickupLocationId && !pickupAt && !returnAt) {
    return null;
  }
  const query = { pickupLocationId, returnLocationId, pickupAt, returnAt };
  if (!isUuid(pickupLocationId) || !isUuid(returnLocationId)) {
    return { error: "Please choose where you'd like to pick up the car.", query };
  }
  const start = fromLocalInput(pickupAt, timeZone);
  const end = fromLocalInput(returnAt, timeZone);
  if (!start || !end) {
    return { error: "Please choose the pickup and return dates and times.", query };
  }
  return { query, start, end };
}

// Tomorrow at 10:00 until three days later at 10:00, at the business: a sensible first search.
export function defaultSearchTimes(timeZone: string, now = new Date()) {
  const day = 86_400_000;
  return {
    pickupAt: `${localDateKey(new Date(now.getTime() + day), timeZone)}T10:00`,
    returnAt: `${localDateKey(new Date(now.getTime() + 4 * day), timeZone)}T10:00`,
  };
}

// The search as URL parameters, for links to the car page and the booking page.
export function searchParamsOf(query: SearchQuery) {
  const params = new URLSearchParams({
    pickupLocationId: query.pickupLocationId,
    pickupAt: query.pickupAt,
    returnAt: query.returnAt,
  });
  if (query.returnLocationId !== query.pickupLocationId) {
    params.set("returnLocationId", query.returnLocationId);
  }
  return params.toString();
}
