import type { Read } from "@/lib/form-input";

// Phone numbers in any common format: "+1 (555) 010-0100", "0300 1234567"...
const PHONE_PATTERN = /^\+?[\d\s().-]{6,24}$/;

export function isValidPhone(phone: string) {
  return PHONE_PATTERN.test(phone) && (phone.match(/\d/g)?.length ?? 0) >= 6;
}

export type BookingDetailsInput = { phone: string; note: string | null };

// The customer's own details on the booking page (the car, dates and extras are read by
// parseQuoteRequest).
export function parseBookingDetails(
  read: Read,
): { values: BookingDetailsInput } | { error: string } {
  const phone = read("phone");
  const note = read("note");
  if (!isValidPhone(phone)) {
    return { error: "Please enter a phone number we can reach you on during the rental." };
  }
  if (note.length > 500) {
    return { error: "The note can be at most 500 characters." };
  }
  return { values: { phone, note: note || null } };
}
