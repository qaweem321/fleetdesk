// Booking statuses and the rules around them (pure, shared by pages, emails and tests).

export type BookingStatus = "pending_payment" | "confirmed" | "active" | "completed" | "cancelled";

// Statuses that keep a car reserved. The database's no-double-booking rule uses the same list
// (drizzle/0004_no_double_bookings.sql).
export const HOLDING_STATUSES = [
  "pending_payment",
  "confirmed",
  "active",
] as const satisfies BookingStatus[];

export const bookingStatusLabels: Record<BookingStatus, string> = {
  pending_payment: "Waiting for payment",
  confirmed: "Confirmed",
  active: "Picked up",
  completed: "Completed",
  cancelled: "Cancelled",
};

const HOUR = 3_600_000;

type Cancellable = { status: BookingStatus; pickupAt: Date };

// Customers can cancel online until `freeCancellationHours` before pickup. Later than that,
// they contact the business (staff can still cancel).
export function customerCanCancel(
  booking: Cancellable,
  freeCancellationHours: number,
  now = new Date(),
) {
  const holdsCar = booking.status === "confirmed" || booking.status === "pending_payment";
  return holdsCar && now.getTime() <= booking.pickupAt.getTime() - freeCancellationHours * HOUR;
}

// The last moment a customer can cancel online.
export function cancellationDeadline(pickupAt: Date, freeCancellationHours: number) {
  return new Date(pickupAt.getTime() - freeCancellationHours * HOUR);
}

// Staff can cancel any booking that hasn't been picked up yet.
export function staffCanCancel(booking: Pick<Cancellable, "status">) {
  return booking.status === "confirmed" || booking.status === "pending_payment";
}

// A short code people can read out on the phone: 6 characters without look-alikes (no 0/O,
// 1/I/L), like "K7M3QX".
const REFERENCE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function makeReference(randomBytes: Uint8Array) {
  return Array.from(
    randomBytes.slice(0, 6),
    (byte) => REFERENCE_ALPHABET[byte % REFERENCE_ALPHABET.length],
  ).join("");
}

// The cancellation sentence for emails and the booking page. It matches what's really
// possible: a booking made after the deadline (a pickup within the free cancellation period)
// never says "free cancellation until" a time that has already passed.
export function cancellationNote(
  pickupAt: Date,
  freeCancellationHours: number,
  formatTime: (date: Date) => string,
  now = new Date(),
) {
  const deadline = cancellationDeadline(pickupAt, freeCancellationHours);
  if (now.getTime() <= deadline.getTime()) {
    return `Free cancellation online until ${formatTime(deadline)}.`;
  }
  return "This booking can no longer be cancelled online. To change or cancel it, please contact us.";
}
