import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { BookingStatusBadge } from "@/components/booking-status-badge";
import { Pager } from "@/components/pager";
import { Tabs } from "@/components/site/tabs";
import { listStaffBookings, type StaffBookingFilter } from "@/lib/bookings/queries";
import { formatDateTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { requireStaff } from "@/lib/session";
import { requireSettings } from "@/lib/settings";
import { buildHref, firstParam, parsePage, type RawSearchParams } from "@/lib/url-params";

export const metadata: Metadata = { title: "Bookings" };

const filters: { value: StaffBookingFilter; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "out", label: "Out now" },
  { value: "past", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;
  const filter =
    filters.find((item) => item.value === firstParam(params.show))?.value ?? "upcoming";
  const page = parsePage(params.page);
  const [, settings, { rows, hasMore }] = await Promise.all([
    requireStaff(),
    requireSettings(),
    listStaffBookings(filter, page),
  ]);
  const href = (values: { show: string; page: number }) =>
    buildHref("/admin/bookings", values, { show: "upcoming", page: 1 });

  return (
    <div className="max-w-5xl">
      <PageHeader title="Bookings" description="Every booking, from the website and the counter." />
      <div className="mb-4">
        <Tabs
          items={filters.map((item) => ({
            label: item.label,
            href: href({ show: item.value, page: 1 }),
          }))}
          activeHref={href({ show: filter, page: 1 })}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Nothing here yet" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Booking</th>
                <th className="px-4 py-2 font-medium">Customer</th>
                <th className="px-4 py-2 font-medium">Car</th>
                <th className="px-4 py-2 font-medium">Pickup</th>
                <th className="px-4 py-2 font-medium">Return</th>
                <th className="px-4 py-2 font-medium text-right">Total</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((booking) => (
                <tr key={booking.id} className="hover:bg-muted">
                  <td className="px-4 py-2">
                    <Link
                      href={`/admin/bookings/${booking.id}`}
                      className="font-mono text-link hover:underline"
                    >
                      {booking.reference}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{booking.customerName}</td>
                  <td className="px-4 py-2">
                    {booking.make} {booking.model}
                    <span className="block font-mono text-xs text-subtle-foreground">
                      {booking.plate}
                    </span>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {formatDateTime(booking.pickupAt, settings.timeZone)}
                    <span className="block text-xs text-subtle-foreground">
                      {booking.pickupLocationName}
                    </span>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {formatDateTime(booking.returnAt, settings.timeZone)}
                    <span className="block text-xs text-subtle-foreground">
                      {booking.returnLocationName}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {formatMoney(booking.total, booking.currency)}
                  </td>
                  <td className="px-4 py-2">
                    <BookingStatusBadge status={booking.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager
        previousHref={page > 1 ? href({ show: filter, page: page - 1 }) : null}
        nextHref={hasMore ? href({ show: filter, page: page + 1 }) : null}
      />
    </div>
  );
}
