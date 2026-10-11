import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { DeleteForm } from "@/components/admin/delete-form";
import { BookingStatusBadge } from "@/components/booking-status-badge";
import { BookingSummary } from "@/components/booking-summary";
import { RentalRecord } from "@/components/rental-record";
import { ButtonLink } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { getBooking } from "@/lib/bookings/queries";
import { cancellationDeadline, customerCanCancel } from "@/lib/bookings/status";
import { depositSentence, paymentSentence } from "@/lib/bookings/wording";
import { isDemoMode } from "@/lib/demo";
import { getDriverProfile } from "@/lib/drivers/profile";
import { formatDateTime, formatTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { sendBookingConfirmedEmails } from "@/lib/notifications/booking-emails";
import { completeCheckout } from "@/lib/payments/checkout";
import { bookingLedger } from "@/lib/payments/records";
import { requireUser } from "@/lib/session";
import { type BusinessSettings, requireSettings } from "@/lib/settings";
import { firstParam, type RawSearchParams } from "@/lib/url-params";
import { isUuid } from "@/lib/uuid";
import { cancelMyBooking, payMyBooking } from "../actions";

export const metadata: Metadata = { title: "Booking" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<RawSearchParams> };

// Back from Stripe's payment page: confirm the payment right away instead of waiting for
// Stripe's webhook (whichever comes first confirms it; the email goes out once).
async function confirmReturnFromPayment(
  sessionId: string,
  bookingId: string,
  settings: BusinessSettings,
) {
  try {
    const result = await completeCheckout(sessionId);
    if (result?.bookingId === bookingId && result.confirmedNow) {
      after(async () => {
        const booking = await getBooking(bookingId);
        if (booking) {
          await sendBookingConfirmedEmails(booking, settings).catch(console.error);
        }
      });
    }
  } catch (error) {
    // The webhook will still confirm it; the page shows "waiting for payment" until then.
    console.error(error);
  }
}

export default async function MyBookingPage({ params, searchParams }: Props) {
  const [{ id }, query, user, settings] = await Promise.all([
    params,
    searchParams,
    requireUser(),
    requireSettings(),
  ]);
  if (!isUuid(id)) {
    notFound();
  }
  const sessionId = firstParam(query.session_id);
  if (sessionId?.startsWith("cs_")) {
    await confirmReturnFromPayment(sessionId, id, settings);
  }
  const booking = await getBooking(id, user.id);
  if (!booking) {
    notFound();
  }
  const [ledger, driver] = await Promise.all([
    bookingLedger(booking.id, booking.total),
    getDriverProfile(user.id),
  ]);
  const needsLicense =
    (booking.status === "confirmed" || booking.status === "pending_payment") &&
    driver?.status !== "approved" &&
    driver?.status !== "pending";
  const justBooked =
    (firstParam(query.booked) === "1" || Boolean(sessionId)) && booking.status === "confirmed";
  const canCancel = customerCanCancel(booking, settings.freeCancellationHours);
  const deadline = formatDateTime(
    cancellationDeadline(booking.pickupAt, settings.freeCancellationHours),
    settings.timeZone,
  );
  const money = paymentSentence({
    ...booking,
    total: ledger.owed,
    paid: ledger.paid,
    refunded: ledger.refunded,
  });

  return (
    <div className="space-y-6">
      <Link href="/account" className="text-sm text-muted-foreground hover:text-foreground">
        ← My bookings
      </Link>

      {justBooked && (
        <div role="status" className="rounded-xl border border-success/40 bg-success/10 p-4">
          <p className="font-semibold">Your car is booked!</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {isDemoMode()
              ? "Emails are turned off in this demo."
              : `We've emailed the details to ${booking.customerEmail}.`}{" "}
            Bring your driver&apos;s license and a payment card in your name to the pickup.
          </p>
        </div>
      )}

      {booking.status === "pending_payment" && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 space-y-3">
          <div>
            <p className="font-semibold">Your payment isn&apos;t finished</p>
            <p className="mt-1 text-sm text-muted-foreground">
              We&apos;re holding the car for you
              {booking.holdExpiresAt
                ? ` until ${formatTime(booking.holdExpiresAt, settings.timeZone)}`
                : ""}
              . Finish paying to confirm the booking.
            </p>
          </div>
          <form action={payMyBooking}>
            <input type="hidden" name="id" value={booking.id} />
            <SubmitButton pendingText="Opening...">
              Pay {formatMoney(booking.total, booking.currency)} now
            </SubmitButton>
          </form>
        </div>
      )}

      {needsLicense && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
          <p className="text-sm">
            <span className="font-semibold">Save time at pickup:</span> send your driver&apos;s
            license now.
          </p>
          <ButtonLink href="/account/driver" variant="outline">
            Add driver details
          </ButtonLink>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">
            {booking.make} {booking.model}
          </h2>
          <p className="text-sm text-muted-foreground">
            Booking <span className="font-mono">{booking.reference}</span>
          </p>
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>

      {booking.status === "cancelled" && booking.cancelledAt && (
        <p className="rounded-xl bg-muted p-4 text-sm">
          Cancelled on {formatDateTime(booking.cancelledAt, settings.timeZone)}.
          {booking.cancelReason && ` ${booking.cancelReason}`}
        </p>
      )}

      <BookingSummary booking={booking} timeZone={settings.timeZone} />

      <RentalRecord
        bookingId={booking.id}
        currency={booking.currency}
        timeZone={settings.timeZone}
        distanceUnit={settings.distanceUnit}
        basePath={`/account/bookings/${booking.id}`}
      />

      <ul className="space-y-1 text-sm text-muted-foreground">
        <li>{money}</li>
        {(booking.status === "confirmed" || booking.status === "pending_payment") &&
          booking.depositAmount > 0 && (
            <li>{depositSentence(booking.depositAmount, booking.currency)}</li>
          )}
      </ul>

      {canCancel ? (
        <section className="rounded-xl border border-border p-5 space-y-3">
          <h3 className="font-semibold">Cancel this booking</h3>
          <p className="text-sm text-muted-foreground">
            Free cancellation until {deadline}
            {ledger.paid > 0 &&
              `, with a full refund of ${formatMoney(ledger.paid, booking.currency)}`}
            .
          </p>
          <DeleteForm
            action={cancelMyBooking}
            fields={{ id: booking.id }}
            confirm="Cancel this booking? The car will be offered to others."
            label="Cancel booking"
            pendingText="Cancelling..."
          />
        </section>
      ) : (
        booking.status === "confirmed" && (
          <p className="text-sm text-muted-foreground">
            The free cancellation period has ended. To change or cancel this booking, please contact
            us
            {settings.contactPhone ? ` on ${settings.contactPhone}` : ""}
            {settings.contactEmail ? ` or at ${settings.contactEmail}` : ""}.
          </p>
        )
      )}
    </div>
  );
}
