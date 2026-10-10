import { optionalText, parseWholeNumber, type Read } from "@/lib/form-input";
import { parseMoney } from "@/lib/money";
import { normalizeCouponCode } from "./coupon";

// Checks for the pricing forms (pure functions, shared by the actions and the tests).
type Result<T> = { values: T } | { error: string };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// "2026-10-11" from an <input type="date">, only if it's a real calendar date.
export function parseDateKey(text: string): string | null {
  if (!DATE_PATTERN.test(text)) {
    return null;
  }
  const date = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(text) ? text : null;
}

// A whole number that may be negative ("-15", "+20", "20").
function parseSignedWholeNumber(text: string, min: number, max: number) {
  if (!/^[+-]?\d{1,4}$/.test(text)) {
    return null;
  }
  const value = Number(text);
  return value >= min && value <= max ? value : null;
}

export type SeasonInput = {
  name: string;
  startsOn: string;
  endsOn: string;
  adjustmentPercent: number;
};

export function parseSeasonInput(read: Read): Result<SeasonInput> {
  const name = read("name");
  const startsOn = parseDateKey(read("startsOn"));
  const endsOn = parseDateKey(read("endsOn"));
  const adjustmentPercent = parseSignedWholeNumber(read("adjustmentPercent"), -90, 500);
  if (!name) {
    return { error: 'Please name the season, like "Summer".' };
  }
  if (name.length > 60) {
    return { error: "The name can be at most 60 characters." };
  }
  if (!startsOn || !endsOn) {
    return { error: "Please choose the first and last day of the season." };
  }
  if (endsOn < startsOn) {
    return { error: "The last day can't be before the first day." };
  }
  if (adjustmentPercent === null || adjustmentPercent === 0) {
    return {
      error: "Please enter the price change in %, like 20 for 20% more or -15 for 15% less.",
    };
  }
  return { values: { name, startsOn, endsOn, adjustmentPercent } };
}

export type ExtraInput = {
  name: string;
  description: string | null;
  price: number;
  charge: "per_day" | "per_rental";
  maxQuantity: number;
};

export function parseExtraInput(read: Read, currency: string): Result<ExtraInput> {
  const name = read("name");
  const description = read("description");
  const price = parseMoney(read("price"), currency);
  const charge = read("charge");
  const maxQuantity = parseWholeNumber(read("maxQuantity") || "1", 1, 10);
  if (!name) {
    return { error: 'Please name the extra, like "Child seat".' };
  }
  if (name.length > 60) {
    return { error: "The name can be at most 60 characters." };
  }
  if (description.length > 300) {
    return { error: "The description can be at most 300 characters." };
  }
  if (price === null) {
    return { error: "Please enter the price, like 8.00 (0 for free)." };
  }
  if (charge !== "per_day" && charge !== "per_rental") {
    return { error: "Please choose whether it's charged per day or once." };
  }
  if (maxQuantity === null) {
    return { error: "The most a customer can add must be between 1 and 10." };
  }
  return { values: { name, description: optionalText(description), price, charge, maxQuantity } };
}

export type CouponInput = {
  code: string;
  type: "percent" | "fixed";
  amount: number;
  validFrom: string | null;
  validUntil: string | null;
  minDays: number | null;
  maxUses: number | null;
};

export function parseCouponInput(read: Read, currency: string): Result<CouponInput> {
  const code = normalizeCouponCode(read("code"));
  const type = read("type");
  const amountText = read("amount");
  const validFromText = read("validFrom");
  const validUntilText = read("validUntil");
  const validFrom = validFromText ? parseDateKey(validFromText) : null;
  const validUntil = validUntilText ? parseDateKey(validUntilText) : null;
  const minDaysText = read("minDays");
  const maxUsesText = read("maxUses");
  const minDays = minDaysText ? parseWholeNumber(minDaysText, 1, 365) : null;
  const maxUses = maxUsesText ? parseWholeNumber(maxUsesText, 1, 1_000_000) : null;

  if (!/^[A-Z0-9-]{3,30}$/.test(code)) {
    return { error: "Codes are 3 to 30 letters, numbers or dashes, like SUMMER-10." };
  }
  if (type !== "percent" && type !== "fixed") {
    return { error: "Please choose a percentage or a fixed amount." };
  }
  const amount =
    type === "percent" ? parseWholeNumber(amountText, 1, 100) : parseMoney(amountText, currency);
  if (!amount) {
    return {
      error:
        type === "percent"
          ? "Please enter a percentage from 1 to 100."
          : "Please enter the discount amount, like 20.00.",
    };
  }
  if ((validFromText && !validFrom) || (validUntilText && !validUntil)) {
    return { error: "Please choose real dates, or leave them empty." };
  }
  if (validFrom && validUntil && validUntil < validFrom) {
    return { error: "The code can't stop being valid before it starts." };
  }
  if (minDaysText && minDays === null) {
    return { error: "Minimum days must be a whole number from 1 to 365, or empty." };
  }
  if (maxUsesText && maxUses === null) {
    return { error: "The number of uses must be a whole number, or empty for unlimited." };
  }
  return { values: { code, type, amount, validFrom, validUntil, minDays, maxUses } };
}

export type RulesInput = {
  taxRate: number;
  taxName: string;
  graceMinutes: number;
  minLeadHours: number;
  maxRentalDays: number;
  turnaroundMinutes: number;
  freeCancellationHours: number;
};

// "8.25" -> 825 (hundredths of a percent). Null for anything that isn't 0-100 with at most two
// decimals.
export function parseTaxRate(text: string): number | null {
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(text)) {
    return null;
  }
  const [whole, fraction = ""] = text.split(".");
  const value = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return value <= 10_000 ? value : null;
}

// 825 -> "8.25", for the form field and labels.
export function taxRateText(taxRate: number) {
  return (taxRate / 100).toFixed(2).replace(/\.?0+$/, "");
}

export function parseRulesInput(read: Read): Result<RulesInput> {
  const taxRate = parseTaxRate(read("taxRate") || "0");
  const taxName = read("taxName") || "Tax";
  const graceMinutes = parseWholeNumber(read("graceMinutes"), 0, 240);
  const minLeadHours = parseWholeNumber(read("minLeadHours"), 0, 720);
  const maxRentalDays = parseWholeNumber(read("maxRentalDays"), 1, 365);
  const turnaroundMinutes = parseWholeNumber(read("turnaroundMinutes"), 0, 1440);
  const freeCancellationHours = parseWholeNumber(read("freeCancellationHours"), 0, 720);
  if (taxRate === null) {
    return { error: "Please enter the tax rate in %, like 8.25 (0 for no tax)." };
  }
  if (taxName.length > 30) {
    return { error: "The tax name can be at most 30 characters." };
  }
  if (graceMinutes === null) {
    return { error: "The grace period must be between 0 and 240 minutes." };
  }
  if (minLeadHours === null) {
    return { error: "The booking notice must be between 0 and 720 hours." };
  }
  if (maxRentalDays === null) {
    return { error: "The longest rental must be between 1 and 365 days." };
  }
  if (turnaroundMinutes === null) {
    return { error: "The cleaning time must be between 0 and 1440 minutes." };
  }
  if (freeCancellationHours === null) {
    return { error: "Free cancellation must be between 0 and 720 hours before pickup." };
  }
  return {
    values: {
      taxRate,
      taxName,
      graceMinutes,
      minLeadHours,
      maxRentalDays,
      turnaroundMinutes,
      freeCancellationHours,
    },
  };
}
