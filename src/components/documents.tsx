import Link from "next/link";
import type { ReactNode } from "react";
import { PrintButton } from "@/components/print-button";
import { QuoteBreakdown } from "@/components/quote-breakdown";
import { type BookingDetails, bookingQuote } from "@/lib/bookings/queries";
import { formatDateTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { getAgreement, listCharges } from "@/lib/operations/queries";
import { bookingLedger, listPayments } from "@/lib/payments/records";
import type { BusinessSettings } from "@/lib/settings";
import { fileUrl } from "@/lib/storage";

type DocumentProps = { booking: BookingDetails; settings: BusinessSettings; backHref: string };

// The signed rental agreement and the receipt, as plain pages that print well (the site's
// header, menus and buttons are hidden when printing). Shown to staff and to the customer.

function Paper({
  title,
  backHref,
  children,
}: {
  title: string;
  backHref: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-2xl space-y-6 bg-background print:max-w-none">
      <Link
        href={backHref}
        className="text-sm text-muted-foreground hover:text-foreground print:hidden"
      >
        ← Booking
      </Link>
      <div className="flex items-center justify-between gap-4 print:hidden">
        <h1 className="text-2xl font-bold">{title}</h1>
        <PrintButton />
      </div>
      {children}
    </article>
  );
}

export async function AgreementDocument({ booking, settings, backHref }: DocumentProps) {
  const agreement = await getAgreement(booking.id);
  if (!agreement) {
    // Still a full page (heading, way back), not a lone sentence.
    return (
      <Paper title="Rental agreement" backHref={backHref}>
        <p className="text-muted-foreground">
          This rental hasn&apos;t started yet, so there&apos;s no signed agreement.
        </p>
      </Paper>
    );
  }
  return (
    <Paper title="Rental agreement" backHref={backHref}>
      <pre className="whitespace-pre-wrap font-sans text-sm leading-6">{agreement.text}</pre>
      <div className="border-t border-border pt-4 text-sm">
        {agreement.signatureFileId && (
          // biome-ignore lint/performance/noImgElement: private upload served by our own route
          <img
            src={fileUrl(agreement.signatureFileId)}
            alt="Signature"
            className="h-24 w-auto rounded bg-white"
          />
        )}
        <p className="mt-2">
          Signed by <strong>{agreement.signerName}</strong> on{" "}
          {formatDateTime(agreement.signedAt, settings.timeZone)}
        </p>
      </div>
    </Paper>
  );
}

export async function ReceiptDocument({ booking, settings, backHref }: DocumentProps) {
  const [charges, rows, ledger] = await Promise.all([
    listCharges(booking.id),
    listPayments(booking.id),
    bookingLedger(booking.id, booking.total),
  ]);
  const money = (amount: number) => formatMoney(amount, booking.currency);
  // Deposit holds and releases aren't money paid: the receipt shows what was paid and refunded.
  const moneyRows = rows.filter(
    (row) => row.kind === "payment" || row.kind === "refund" || row.kind === "deposit_capture",
  );

  return (
    <Paper title="Receipt" backHref={backHref}>
      <header className="space-y-1 text-sm">
        <p className="text-lg font-semibold">{settings.businessName}</p>
        {settings.address && <p>{settings.address}</p>}
        <p>
          Receipt for booking <span className="font-mono">{booking.reference}</span> ·{" "}
          {booking.customerName}
        </p>
        <p className="text-muted-foreground">
          {booking.make} {booking.model} ({booking.plate}) ·{" "}
          {formatDateTime(booking.pickedUpAt ?? booking.pickupAt, settings.timeZone)} –{" "}
          {formatDateTime(booking.returnedAt ?? booking.returnAt, settings.timeZone)}
        </p>
      </header>

      <QuoteBreakdown
        quote={bookingQuote(booking)}
        currency={booking.currency}
        taxName={booking.taxName}
        taxRate={booking.taxRate}
        couponCode={booking.couponCode}
      />

      {charges.length > 0 && (
        <section className="space-y-1 text-sm">
          <h2 className="font-semibold">Extra charges</h2>
          {charges.map((charge) => (
            <p key={charge.id} className="flex justify-between gap-4">
              <span>{charge.description}</span>
              <span className="tabular-nums">{money(charge.amount)}</span>
            </p>
          ))}
        </section>
      )}

      <section className="space-y-1 border-t border-border pt-3 text-sm">
        <h2 className="font-semibold">Payments</h2>
        {moneyRows.length === 0 && <p className="text-muted-foreground">No payments recorded.</p>}
        {moneyRows.map((row) => (
          <p key={row.id} className="flex justify-between gap-4">
            <span>
              {row.description} · {formatDateTime(row.createdAt, settings.timeZone)}
            </span>
            <span className="tabular-nums">
              {row.kind === "refund" ? "−" : ""}
              {money(row.amount)}
            </span>
          </p>
        ))}
        <p className="flex justify-between gap-4 pt-2 text-base font-semibold">
          <span>{ledger.due > 0 ? "Still to pay" : "Balance"}</span>
          <span className="tabular-nums">{money(ledger.due)}</span>
        </p>
      </section>
    </Paper>
  );
}
