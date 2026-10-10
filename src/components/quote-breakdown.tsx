import { formatMoney } from "@/lib/money";
import { taxRateText } from "@/lib/pricing/input";
import type { Quote } from "@/lib/pricing/quote";

type Props = {
  quote: Quote;
  currency: string;
  taxName: string;
  taxRate: number;
  couponCode?: string | null;
};

// The price, line by line: rental, extras, fees, discount, tax and total. Shown to customers
// before they book, on their booking, and to staff.
export function QuoteBreakdown({ quote, currency, taxName, taxRate, couponCode }: Props) {
  const money = (amount: number) => formatMoney(amount, currency);
  const rows: { label: string; detail?: string; amount: string }[] = [
    {
      label: `Rental, ${quote.days} ${quote.days === 1 ? "day" : "days"}`,
      detail: [quote.usesWeeklyRate ? "weekly price" : null, ...quote.seasonNotes]
        .filter(Boolean)
        .join(" · "),
      amount: money(quote.rentalPrice),
    },
    ...quote.extras.map((line) => ({
      label: line.quantity > 1 ? `${line.name} × ${line.quantity}` : line.name,
      amount: money(line.amount),
    })),
  ];
  if (quote.dropOffFee > 0) {
    rows.push({ label: "Drop-off fee (one-way)", amount: money(quote.dropOffFee) });
  }
  if (quote.discount > 0) {
    rows.push({
      label: couponCode ? `Discount (${couponCode})` : "Discount",
      amount: `−${money(quote.discount)}`,
    });
  }
  if (taxRate > 0) {
    rows.push({ label: `${taxName} (${taxRateText(taxRate)}%)`, amount: money(quote.tax) });
  }

  return (
    <dl className="space-y-2 text-sm">
      {rows.map((row) => (
        <div key={row.label} className="flex justify-between gap-4">
          <dt>
            {row.label}
            {row.detail && (
              <span className="block text-xs text-subtle-foreground">{row.detail}</span>
            )}
          </dt>
          <dd className="tabular-nums">{row.amount}</dd>
        </div>
      ))}
      <div className="flex justify-between gap-4 border-t border-border pt-2 text-base font-semibold">
        <dt>Total</dt>
        <dd className="tabular-nums">{money(quote.total)}</dd>
      </div>
    </dl>
  );
}
