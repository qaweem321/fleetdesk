import type { Read } from "@/lib/form-input";
import { parseMoney } from "@/lib/money";

const METHODS = ["cash", "card_terminal", "other"] as const;
export type ManualMethod = (typeof METHODS)[number];

export const manualMethodLabels: Record<ManualMethod, string> = {
  cash: "Cash",
  card_terminal: "Card terminal",
  other: "Other (bank transfer...)",
};

export type ManualPaymentInput = { amount: number; method: ManualMethod; description: string };

// A payment or refund staff record by hand: money that moved at the counter, not through Stripe.
export function parseManualPayment(
  read: Read,
  currency: string,
): { values: ManualPaymentInput } | { error: string } {
  const amount = parseMoney(read("amount"), currency);
  const method = read("method");
  const description = read("description");
  if (!amount) {
    return { error: "Please enter the amount, like 120.00." };
  }
  if (!(METHODS as readonly string[]).includes(method)) {
    return { error: "Please choose how it was paid." };
  }
  if (!description) {
    return { error: 'Please say what it was for, like "Rental" or "Fuel refill".' };
  }
  if (description.length > 200) {
    return { error: "The description can be at most 200 characters." };
  }
  return { values: { amount, method: method as ManualMethod, description } };
}
