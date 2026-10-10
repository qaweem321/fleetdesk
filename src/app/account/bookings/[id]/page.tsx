import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteForm } from "@/components/admin/delete-form";
import { BookingStatusBadge } from "@/components/booking-status-badge";
import { BookingSummary } from "@/components/booking-summary";
import { getBooking } from "@/lib/bookings/queries";
import { cancellationDeadline, customerCanCancel } from "@/lib/bookings/status";
import { formatDateTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { requireUser } from "@/lib/session";
import { requireSettings } from "@/lib/settings";
import { firstParam, type RawSearchParams } from "@/lib/url-params";
import { isUuid } from "@/lib/uuid";
import { cancelMyBooking } from "../actions";

export const metadata: Metadata = { title: "Booking" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<RawSearchParams> };

export default async function MyBookingPage({ params, searchParams }: Props) {
  const [{ id }, query, user, settings] = await Promise.all([
    params,
    searchParams,
    requireUser(),
    requireSettings(),
  ]);
  const booking = isUuid(id) ? await getBooking(id, user.id) : null;
  if (!booking) {
    notFound();
  }
  const justBooked = firstParam(query.booked) === "1" && booking.status === "confirmed";
  const canCancel = customerCanCancel(booking, settings.freeCancellationHours);
  const deadline = formatDateTime(
    cancellationDeadline(booking.pickupAt, settings.freeCancellationHours),
    settings.timeZone,
  );

  return (
    <div className="space-y-6">
      <Link href="/account" className="text-sm text-muted-foreground hover:text-foreground">
        ← My bookings
      </Link>

      {justBooked && (
        <div role="status" className="rounded-xl border border-success/40 bg-success/10 p-4">
          <p className="font-semibold">Your car is booked!</p>
          <p className="mt-1 text-sm text-muted-foreground">
            We&apos;ve emailed the details to {booking.customerEmail}. Bring your driver&apos;s
            license and a payment card in your name to the pickup.
          </p>
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

      {booking.status === "confirmed" && (
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>You pay {formatMoney(booking.total, booking.currency)} at pickup.</li>
          {booking.depositAmount > 0 && (
            <li>
              A deposit of {formatMoney(booking.depositAmount, booking.currency)} is held on your
              card at pickup and released after the return.
            </li>
          )}
        </ul>
      )}

      {canCancel ? (
        <section className="rounded-xl border border-border p-5 space-y-3">
          <h3 className="font-semibold">Cancel this booking</h3>
          <p className="text-sm text-muted-foreground">Free cancellation until {deadline}.</p>
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
