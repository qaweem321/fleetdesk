import { absoluteUrl } from "@/config/site";
import type { BookingDetails } from "@/lib/bookings/queries";
import { cancellationNote } from "@/lib/bookings/status";
import { detailsEmailHtml, detailsEmailText, type Email, sendEmails } from "@/lib/email";
import { formatDateTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import type { BusinessSettings } from "@/lib/settings";

// The emails a booking sends. Built from the saved booking, so they always match what the
// customer sees on their booking page.

function place(name: string, address: string | null) {
  return address ? `${name}\n${address}` : name;
}

function bookingRows(booking: BookingDetails, settings: BusinessSettings): [string, string][] {
  const when = (date: Date) => formatDateTime(date, settings.timeZone);
  const rows: [string, string][] = [
    ["Booking", booking.reference],
    ["Car", `${booking.make} ${booking.model}`],
    [
      "Pickup",
      `${when(booking.pickupAt)}\n${place(booking.pickupLocationName, booking.pickupLocationAddress)}`,
    ],
    [
      "Return",
      `${when(booking.returnAt)}\n${place(booking.returnLocationName, booking.returnLocationAddress)}`,
    ],
  ];
  if (booking.extras.length > 0) {
    rows.push([
      "Extras",
      booking.extras
        .map((extra) => (extra.quantity > 1 ? `${extra.name} × ${extra.quantity}` : extra.name))
        .join(", "),
    ]);
  }
  rows.push(["Total", formatMoney(booking.total, booking.currency)]);
  return rows;
}

function toEmail(
  to: string,
  subject: string,
  content: Parameters<typeof detailsEmailHtml>[0],
  replyTo: string | null,
): Email {
  return { to, subject, text: detailsEmailText(content), html: detailsEmailHtml(content), replyTo };
}

// To the customer: "your booking is confirmed", and to the business: "new booking".
export async function sendBookingConfirmedEmails(
  booking: BookingDetails,
  settings: BusinessSettings,
) {
  const rows = bookingRows(booking, settings);
  const deposit =
    booking.depositAmount > 0
      ? ` A deposit of ${formatMoney(booking.depositAmount, booking.currency)} is held on your card at pickup and released after the return.`
      : "";
  const cancellation = cancellationNote(booking.pickupAt, settings.freeCancellationHours, (date) =>
    formatDateTime(date, settings.timeZone),
  );
  const emails = [
    toEmail(
      booking.customerEmail,
      `Booking confirmed: ${booking.make} ${booking.model} (${booking.reference})`,
      {
        heading: "Your booking is confirmed",
        message: `Hi ${booking.customerName}, thank you for booking with ${settings.businessName}. You pay at pickup. Please bring your driver's license and a payment card in your name.${deposit}`,
        rows,
        button: { text: "View your booking", url: absoluteUrl(`/account/bookings/${booking.id}`) },
        footer: cancellation,
      },
      settings.contactEmail,
    ),
  ];
  if (settings.contactEmail) {
    emails.push(
      toEmail(
        settings.contactEmail,
        `New booking ${booking.reference}: ${booking.make} ${booking.model}`,
        {
          heading: "New booking",
          message: `${booking.customerName} (${booking.customerEmail}, ${booking.customerPhone}) booked a car.${booking.customerNote ? ` Note: "${booking.customerNote}"` : ""}`,
          rows: [...rows, ["Car assigned", booking.plate]],
          button: { text: "Open in admin", url: absoluteUrl(`/admin/bookings/${booking.id}`) },
        },
        booking.customerEmail,
      ),
    );
  }
  await sendEmails(emails);
}

// To the customer and the business when a booking is cancelled.
export async function sendBookingCancelledEmails(
  booking: BookingDetails,
  settings: BusinessSettings,
  cancelledBy: "customer" | "staff",
) {
  const rows = bookingRows(booking, settings);
  const emails = [
    toEmail(
      booking.customerEmail,
      `Booking cancelled (${booking.reference})`,
      {
        heading: "Your booking is cancelled",
        message:
          cancelledBy === "customer"
            ? `Hi ${booking.customerName}, as requested, your booking with ${settings.businessName} is cancelled.`
            : `Hi ${booking.customerName}, ${settings.businessName} has cancelled your booking.${booking.cancelReason ? ` Reason: ${booking.cancelReason}` : ""} Please contact us if you have any questions.`,
        rows,
      },
      settings.contactEmail,
    ),
  ];
  if (settings.contactEmail && cancelledBy === "customer") {
    emails.push(
      toEmail(
        settings.contactEmail,
        `Booking ${booking.reference} cancelled by the customer`,
        {
          heading: "Booking cancelled",
          message: `${booking.customerName} cancelled their booking. The car is free again.`,
          rows,
        },
        booking.customerEmail,
      ),
    );
  }
  await sendEmails(emails);
}
