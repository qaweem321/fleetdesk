import { QuoteBreakdown } from "@/components/quote-breakdown";
import { type BookingDetails, bookingQuote } from "@/lib/bookings/queries";
import { formatDateTime } from "@/lib/format";

type Props = { booking: BookingDetails; timeZone: string };

function Place({
  label,
  when,
  name,
  address,
}: {
  label: string;
  when: string;
  name: string;
  address: string | null;
}) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">
        <span className="block font-medium">{when}</span>
        <span className="block">{name}</span>
        {address && <span className="block text-sm text-muted-foreground">{address}</span>}
      </dd>
    </div>
  );
}

// Where, when and how much: the same block for the customer and for staff.
export function BookingSummary({ booking, timeZone }: Props) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <dl className="space-y-4">
        <Place
          label="Pickup"
          when={formatDateTime(booking.pickupAt, timeZone)}
          name={booking.pickupLocationName}
          address={booking.pickupLocationAddress}
        />
        <Place
          label="Return"
          when={formatDateTime(booking.returnAt, timeZone)}
          name={booking.returnLocationName}
          address={booking.returnLocationAddress}
        />
        {booking.customerNote && (
          <div>
            <dt className="text-sm text-muted-foreground">Note</dt>
            <dd className="mt-0.5">{booking.customerNote}</dd>
          </div>
        )}
      </dl>
      <div className="rounded-xl bg-muted p-4">
        <QuoteBreakdown
          quote={bookingQuote(booking)}
          currency={booking.currency}
          taxName={booking.taxName}
          taxRate={booking.taxRate}
          couponCode={booking.couponCode}
        />
      </div>
    </div>
  );
}
