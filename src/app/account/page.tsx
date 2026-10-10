import type { Metadata } from "next";
import Link from "next/link";
import { BookingStatusBadge } from "@/components/booking-status-badge";
import { ButtonLink } from "@/components/ui/button";
import { listCustomerBookings } from "@/lib/bookings/queries";
import { formatDateTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { requireUser } from "@/lib/session";
import { requireSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "My bookings" };

export default async function MyBookingsPage() {
  const user = await requireUser();
  const [settings, bookings] = await Promise.all([
    requireSettings(),
    listCustomerBookings(user.id),
  ]);

  if (bookings.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center">
        <p className="font-medium">No bookings yet</p>
        <p className="mt-1 text-sm text-muted-foreground">When you book a car, it shows up here.</p>
        <ButtonLink href="/cars" className="mt-4">
          Find a car
        </ButtonLink>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border">
      {bookings.map((booking) => (
        <li key={booking.id}>
          <Link
            href={`/account/bookings/${booking.id}`}
            className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-muted"
          >
            <div className="min-w-0">
              <p className="font-medium">
                {booking.make} {booking.model}{" "}
                <span className="font-mono text-sm text-subtle-foreground">
                  {booking.reference}
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                {formatDateTime(booking.pickupAt, settings.timeZone)} –{" "}
                {formatDateTime(booking.returnAt, settings.timeZone)}
              </p>
              <p className="text-sm text-muted-foreground">{booking.pickupLocationName}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium tabular-nums">
                {formatMoney(booking.total, booking.currency)}
              </span>
              <BookingStatusBadge status={booking.status} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
