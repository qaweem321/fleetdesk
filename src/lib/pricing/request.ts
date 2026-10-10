import { fromLocalInput } from "@/lib/time-zone";
import { isUuid } from "@/lib/uuid";
import type { QuoteRequest } from "./build-quote";

// Extra quantities are sent as fields named "extra_<id>".
export const EXTRA_FIELD_PREFIX = "extra_";

type Fields = Iterable<[string, FormDataEntryValue]>;

// Reads a booking or price request from a form (or URL search params): car model, locations,
// times at the business, extras and coupon. Every value is checked; nothing is trusted.
export function parseQuoteRequest(
  fields: Fields,
  timeZone: string,
): { request: QuoteRequest } | { error: string } {
  const values = new Map<string, string>();
  const extras = new Map<string, number>();
  for (const [name, raw] of fields) {
    const value = String(raw).trim();
    if (name.startsWith(EXTRA_FIELD_PREFIX)) {
      const id = name.slice(EXTRA_FIELD_PREFIX.length);
      const quantity = /^\d{1,2}$/.test(value) ? Number(value) : 0;
      if (isUuid(id) && quantity > 0) {
        extras.set(id, quantity);
      }
    } else {
      values.set(name, value);
    }
  }

  const carModelId = values.get("carModelId") ?? "";
  const pickupLocationId = values.get("pickupLocationId") ?? "";
  const returnLocationId = values.get("returnLocationId") || pickupLocationId;
  const start = fromLocalInput(values.get("pickupAt") ?? "", timeZone);
  const end = fromLocalInput(values.get("returnAt") ?? "", timeZone);

  if (!isUuid(carModelId)) {
    return { error: "Please choose a car." };
  }
  if (!isUuid(pickupLocationId) || !isUuid(returnLocationId)) {
    return { error: "Please choose where you pick up and return the car." };
  }
  if (!start || !end) {
    return { error: "Please choose the pickup and return date and time." };
  }
  return {
    request: {
      carModelId,
      pickupLocationId,
      returnLocationId,
      start,
      end,
      extras,
      couponCode: (values.get("coupon") ?? "").slice(0, 40),
    },
  };
}
