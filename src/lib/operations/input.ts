import { parseWholeNumber, type Read } from "@/lib/form-input";
import type { ChargeKind, ChargeLine } from "./charges";

// Checks for the pickup and return forms (pure, shared by the actions and the tests).
type Result<T> = { values: T } | { error: string };

export type InspectionInput = { mileage: number; fuelLevel: number; notes: string | null };

export function parseInspectionInput(read: Read, minimumMileage: number): Result<InspectionInput> {
  const mileage = parseWholeNumber(read("mileage"), 0, 9_999_999);
  const fuelLevel = parseWholeNumber(read("fuelLevel"), 0, 8);
  const notes = read("notes");
  if (mileage === null) {
    return { error: "Please enter the mileage shown on the dashboard." };
  }
  if (mileage < minimumMileage) {
    return { error: `The mileage can't be lower than ${minimumMileage.toLocaleString("en-US")}.` };
  }
  if (fuelLevel === null) {
    return { error: "Please choose the fuel level." };
  }
  if (notes.length > 1000) {
    return { error: "Notes can be at most 1000 characters." };
  }
  return { values: { mileage, fuelLevel, notes: notes || null } };
}

const MAX_SIGNATURE_BYTES = 300 * 1024;
const PNG_PREFIX = "data:image/png;base64,";

// The drawn signature arrives as a PNG data URL. Null when it's missing, too big or not a PNG.
export function parseSignature(value: string): Buffer | null {
  if (!value.startsWith(PNG_PREFIX)) {
    return null;
  }
  const data = Buffer.from(value.slice(PNG_PREFIX.length), "base64");
  const isPng = data.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  return isPng && data.length > 0 && data.length <= MAX_SIGNATURE_BYTES ? data : null;
}

const CHARGE_KINDS: ChargeKind[] = [
  "extra_distance",
  "fuel",
  "late_return",
  "damage",
  "cleaning",
  "other",
];

// The charges staff confirmed on the return form, sent as JSON. Every line is checked again
// here: a known kind, a description and a sensible amount.
export function parseChargeLines(json: string): Result<ChargeLine[]> {
  let raw: unknown;
  try {
    raw = JSON.parse(json || "[]");
  } catch {
    return { error: "The charges couldn't be read. Please try again." };
  }
  if (!Array.isArray(raw) || raw.length > 20) {
    return { error: "Please add at most 20 charges." };
  }
  const lines: ChargeLine[] = [];
  for (const item of raw) {
    const kind = (item as { kind?: unknown })?.kind;
    const description = String((item as { description?: unknown })?.description ?? "").trim();
    const amount = (item as { amount?: unknown })?.amount;
    if (!CHARGE_KINDS.includes(kind as ChargeKind)) {
      return { error: "One of the charges has an unknown type." };
    }
    if (!description || description.length > 200) {
      return { error: "Every charge needs a short description (200 characters at most)." };
    }
    if (
      typeof amount !== "number" ||
      !Number.isInteger(amount) ||
      amount <= 0 ||
      amount > 100_000_000
    ) {
      return { error: `Please check the amount of "${description}".` };
    }
    lines.push({ kind: kind as ChargeKind, description, amount });
  }
  return { values: lines };
}
