import { formatMoney } from "@/lib/money";
import type { BookingStatus } from "./status";

// What we tell the customer about money, in one place, so the booking page and every email say
// the same thing and it always matches what really happened (never "you pay at pickup" for a
// booking that was paid online, or "paid" for one that was refunded).

type MoneyState = {
  status: BookingStatus;
  paymentMethod: "pay_at_pickup" | "online";
  total: number;
  currency: string;
  // From the payment records: received minus refunds, and refunded.
  paid: number;
  refunded: number;
};

export function paymentSentence(booking: MoneyState) {
  const money = (amount: number) => formatMoney(amount, booking.currency);
  const due = Math.max(0, booking.total - booking.paid);

  if (booking.status === "cancelled") {
    if (booking.refunded > 0) {
      return `${money(booking.refunded)} has been refunded to your card. It can take 5 to 10 business days to show on your statement.`;
    }
    return booking.paid > 0
      ? `${money(booking.paid)} was paid and has not been refunded.`
      : "Nothing was charged.";
  }
  if (booking.status === "pending_payment") {
    return `Waiting for your online payment of ${money(booking.total)}. The car is held for you until then.`;
  }
  if (due === 0) {
    return booking.paymentMethod === "online"
      ? `Paid online: ${money(booking.paid)}.`
      : `Paid: ${money(booking.paid)}.`;
  }
  if (booking.paid > 0) {
    return `Paid ${money(booking.paid)}. Still to pay: ${money(due)}.`;
  }
  return booking.status === "confirmed"
    ? `You pay ${money(due)} at pickup.`
    : `Still to pay: ${money(due)}.`;
}
