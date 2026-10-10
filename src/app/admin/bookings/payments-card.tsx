import { Card } from "@/components/admin/page-header";
import { ActionForm, ActionMessage } from "@/components/ui/action-form";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { SubmitButton } from "@/components/ui/submit-button";
import type { BookingDetails } from "@/lib/bookings/queries";
import { formatDateTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { manualMethodLabels } from "@/lib/payments/input";
import { bookingLedger, listPayments } from "@/lib/payments/records";
import { recordPayment, refundPayment } from "./payment-actions";

const kindLabels = {
  payment: "Payment",
  refund: "Refund",
  deposit_hold: "Deposit held",
  deposit_capture: "Deposit charged",
  deposit_release: "Deposit released",
};

const methodLabels = { stripe: "Online card", ...manualMethodLabels };

type Props = { booking: BookingDetails; timeZone: string; canRefund: boolean };

function MethodSelect({ id }: { id: string }) {
  return (
    <Select id={id} name="method" defaultValue="card_terminal" className="w-full">
      {Object.entries(manualMethodLabels).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </Select>
  );
}

// The booking's money: every payment and refund, what's still due, and forms to record a
// payment taken at the counter or to give money back.
export async function PaymentsCard({ booking, timeZone, canRefund }: Props) {
  const [rows, ledger] = await Promise.all([
    listPayments(booking.id),
    bookingLedger(booking.id, booking.total),
  ]);
  const money = (amount: number) => formatMoney(amount, booking.currency);
  const paidOnline = rows.some((row) => row.method === "stripe" && row.kind === "payment");

  return (
    <Card title="Payments">
      <dl className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Total</dt>
          <dd className="text-lg font-semibold tabular-nums">{money(booking.total)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Paid</dt>
          <dd className="text-lg font-semibold tabular-nums">{money(ledger.paid)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Still to pay</dt>
          <dd
            className={`text-lg font-semibold tabular-nums ${ledger.due > 0 && booking.status !== "cancelled" ? "text-warning" : ""}`}
          >
            {booking.status === "cancelled" ? "—" : money(ledger.due)}
          </dd>
        </div>
      </dl>

      {rows.length > 0 && (
        <ul className="mt-4 divide-y divide-border rounded-lg border border-border text-sm">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <div>
                <p className="font-medium">
                  {kindLabels[row.kind]} · {methodLabels[row.method]}
                </p>
                <p className="text-muted-foreground">
                  {row.description} · {formatDateTime(row.createdAt, timeZone)}
                </p>
              </div>
              <span className="tabular-nums">
                {row.kind === "refund" ? "−" : ""}
                {money(row.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {booking.status !== "cancelled" && ledger.due > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-link">
            Record a payment
          </summary>
          <ActionForm
            action={recordPayment.bind(null, booking.id)}
            resetOnSuccess
            className="mt-3 space-y-3"
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Amount" htmlFor="payment-amount">
                <MoneyInput
                  id="payment-amount"
                  name="amount"
                  required
                  currency={booking.currency}
                  amount={ledger.due}
                />
              </Field>
              <Field label="Paid by" htmlFor="payment-method">
                <MethodSelect id="payment-method" />
              </Field>
              <Field label="For" htmlFor="payment-description">
                <Input
                  id="payment-description"
                  name="description"
                  required
                  defaultValue="Rental"
                  maxLength={200}
                />
              </Field>
            </div>
            <ActionMessage />
            <SubmitButton variant="outline" pendingText="Saving...">
              Record payment
            </SubmitButton>
          </ActionForm>
        </details>
      )}

      {canRefund && ledger.paid > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-link">Give a refund</summary>
          <ActionForm
            action={refundPayment.bind(null, booking.id)}
            resetOnSuccess
            className="mt-3 space-y-3"
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Amount" htmlFor="refund-amount" hint={`At most ${money(ledger.paid)}`}>
                <MoneyInput id="refund-amount" name="amount" required currency={booking.currency} />
              </Field>
              <Field label="Refund to" htmlFor="refund-via">
                <Select
                  id="refund-via"
                  name="via"
                  defaultValue={paidOnline ? "stripe" : "counter"}
                  className="w-full"
                >
                  {paidOnline && <option value="stripe">The customer&apos;s card (online)</option>}
                  <option value="counter">At the counter (record only)</option>
                </Select>
              </Field>
              <Field label="Reason" htmlFor="refund-description">
                <Input id="refund-description" name="description" required maxLength={200} />
              </Field>
            </div>
            {/* For a counter refund: how the money was given back. */}
            <Field label="Given back as (counter refunds)" htmlFor="refund-method">
              <MethodSelect id="refund-method" />
            </Field>
            <ActionMessage />
            <SubmitButton
              variant="danger-outline"
              pendingText="Refunding..."
              confirm="Give this refund?"
            >
              Refund
            </SubmitButton>
          </ActionForm>
        </details>
      )}
    </Card>
  );
}
