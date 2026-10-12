import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/admin/page-header";
import { BookingStatusBadge } from "@/components/booking-status-badge";
import { BookingSummary } from "@/components/booking-summary";
import { RentalRecord } from "@/components/rental-record";
import { ActionForm, ActionMessage } from "@/components/ui/action-form";
import { ButtonLink } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { getBooking } from "@/lib/bookings/queries";
import { staffCanCancel } from "@/lib/bookings/status";
import { formatDateTime } from "@/lib/format";
import { formatMoney, moneyInputValue } from "@/lib/money";
import { hasCardDeposit } from "@/lib/payments/deposits";
import { bookingLedger } from "@/lib/payments/records";
import { can } from "@/lib/permissions";
import { requireStaff } from "@/lib/session";
import { requireSettings } from "@/lib/settings";
import { isUuid } from "@/lib/uuid";
import { staffCancelBooking } from "../actions";
import { PaymentsCard } from "../payments-card";
import { settleDepositAfterReturn } from "./return/actions";

export const metadata: Metadata = { title: "Booking" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StaffBookingPage({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!isUuid(id)) {
    notFound();
  }
  const [user, settings, booking] = await Promise.all([
    requireStaff(),
    requireSettings(),
    getBooking(id),
  ]);
  if (!booking) {
    notFound();
  }
  // A card deposit still held after the return (Stripe couldn't be reached at the time).
  const openDeposit =
    booking.status === "completed" && (await hasCardDeposit(booking.id))
      ? await bookingLedger(booking.id, booking.total)
      : null;

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title={`Booking ${booking.reference}`}
        back={{ label: "Bookings", href: "/admin/bookings" }}
        description={
          <span className="flex flex-wrap items-center gap-2">
            Booked {formatDateTime(booking.createdAt, settings.timeZone)}
            <BookingStatusBadge status={booking.status} />
          </span>
        }
      />

      {query.hold === "unsettled" && (
        <p role="status" className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
          The car is back, but Stripe couldn&apos;t be reached to settle the deposit on the card.
          Settle it below.
        </p>
      )}
      {query.hold === "expired" && (
        <p role="status" className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
          The hold on the customer&apos;s card had expired, so nothing could be charged from the
          deposit. Collect what&apos;s still to pay below and record it.
        </p>
      )}

      {openDeposit && openDeposit.depositHeld > 0 && (
        <Card title="Settle the deposit">
          <p className="text-sm text-muted-foreground">
            {formatMoney(openDeposit.depositHeld, booking.currency)} is still held on the
            customer&apos;s card, and the customer owes{" "}
            {formatMoney(openDeposit.due, booking.currency)}. What you don&apos;t keep goes back to
            the card.
          </p>
          <ActionForm action={settleDepositAfterReturn} className="mt-3 space-y-3">
            <input type="hidden" name="id" value={booking.id} />
            <Field label="Keep from the deposit" htmlFor="deposit-keep">
              <Input
                id="deposit-keep"
                name="depositKeep"
                inputMode="decimal"
                defaultValue={moneyInputValue(
                  Math.min(openDeposit.due, openDeposit.depositHeld),
                  booking.currency,
                )}
                className="w-40"
              />
            </Field>
            <ActionMessage />
            <SubmitButton pendingText="Settling..." confirm="Settle the deposit on the card now?">
              Settle deposit
            </SubmitButton>
          </ActionForm>
        </Card>
      )}

      {booking.status === "confirmed" && (
        <ButtonLink href={`/admin/bookings/${booking.id}/pickup`} size="lg">
          Start pickup
        </ButtonLink>
      )}
      {booking.status === "active" && (
        <ButtonLink href={`/admin/bookings/${booking.id}/return`} size="lg">
          Take the car back
        </ButtonLink>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Customer">
          <dl className="space-y-1 text-sm">
            <dt className="sr-only">Name</dt>
            <dd className="font-medium">{booking.customerName}</dd>
            <dt className="sr-only">Email</dt>
            <dd>
              <a href={`mailto:${booking.customerEmail}`} className="text-link hover:underline">
                {booking.customerEmail}
              </a>
            </dd>
            <dt className="sr-only">Phone</dt>
            <dd>
              <a href={`tel:${booking.customerPhone}`} className="text-link hover:underline">
                {booking.customerPhone}
              </a>
            </dd>
          </dl>
        </Card>
        <Card title="Car">
          <p className="font-medium">
            {booking.make} {booking.model}
          </p>
          <Link
            href={`/admin/vehicles/${booking.vehicleId}`}
            className="font-mono text-sm text-link hover:underline"
          >
            {booking.plate}
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">
            {booking.paymentMethod === "pay_at_pickup" ? "Payment at pickup" : "Online payment"}
            {booking.depositAmount > 0 &&
              ` · deposit ${formatMoney(booking.depositAmount, booking.currency)}`}
          </p>
        </Card>
      </div>

      <Card title="Rental">
        <BookingSummary booking={booking} timeZone={settings.timeZone} />
      </Card>

      <RentalRecord
        bookingId={booking.id}
        currency={booking.currency}
        timeZone={settings.timeZone}
        distanceUnit={settings.distanceUnit}
        basePath={`/admin/bookings/${booking.id}`}
      />

      <PaymentsCard
        booking={booking}
        timeZone={settings.timeZone}
        canRefund={can(user.role, "payments:refund")}
      />

      {booking.status === "cancelled" && booking.cancelledAt && (
        <Card title="Cancelled">
          <p className="text-sm">
            {formatDateTime(booking.cancelledAt, settings.timeZone)}: {booking.cancelReason}
          </p>
        </Card>
      )}

      {staffCanCancel(booking) && (
        <Card title="Cancel booking">
          <ActionForm action={staffCancelBooking} className="space-y-3">
            <input type="hidden" name="id" value={booking.id} />
            <Field
              label="Reason"
              htmlFor="cancel-reason"
              hint="The customer sees this in their email."
            >
              <Input
                id="cancel-reason"
                name="reason"
                required
                maxLength={300}
                placeholder="The car is unavailable after an accident"
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="notify"
                defaultChecked
                className="h-4 w-4 accent-[var(--primary)]"
              />
              Email the customer
            </label>
            {booking.paymentMethod === "online" && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="refund"
                  defaultChecked
                  className="h-4 w-4 accent-[var(--primary)]"
                />
                Refund the online payment in full
              </label>
            )}
            <ActionMessage />
            <SubmitButton
              variant="danger-outline"
              pendingText="Cancelling..."
              confirm="Cancel this booking?"
            >
              Cancel booking
            </SubmitButton>
          </ActionForm>
        </Card>
      )}
    </div>
  );
}
