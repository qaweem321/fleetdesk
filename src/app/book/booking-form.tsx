"use client";

import Link from "next/link";
import {
  type FormEvent,
  type KeyboardEvent,
  startTransition,
  useActionState,
  useRef,
  useState,
  useTransition,
} from "react";
import { QuoteBreakdown } from "@/components/quote-breakdown";
import { Button } from "@/components/ui/button";
import { Field, FormMessage } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { formatMoney } from "@/lib/money";
import type { PaymentMethod } from "@/lib/payments/options";
import type { Quote } from "@/lib/pricing/quote";
import { EXTRA_FIELD_PREFIX } from "@/lib/pricing/request";
import { type BookState, bookCar, type QuoteState, quoteBooking } from "./actions";

type Extra = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  charge: "per_day" | "per_rental";
  maxQuantity: number;
};

type Props = {
  // The car, locations and times, sent along unchanged.
  request: Record<string, string>;
  extras: Extra[];
  initialQuote: Quote;
  currency: string;
  taxName: string;
  taxRate: number;
  phone: string;
  // The ways to pay, the first being the default (see paymentMethodsFor).
  paymentMethods: PaymentMethod[];
  // Set when we don't know the driver's date of birth yet: the form asks for it.
  minDriverAge: number | null;
};

const paymentLabels: Record<PaymentMethod, { title: string; text: string }> = {
  online: { title: "Pay now by card", text: "Secure payment on the next page." },
  pay_at_pickup: { title: "Pay at pickup", text: "Nothing is charged now." },
};

// 0, 1, 2 ... max: the choices for an extra customers can add several of.
function quantities(max: number) {
  return Array.from({ length: max + 1 }, (_, count) => String(count));
}

export function BookingForm({
  request,
  extras,
  initialQuote,
  currency,
  taxName,
  taxRate,
  phone,
  paymentMethods,
  minDriverAge,
}: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [priced, setPriced] = useState<QuoteState>({ quote: initialQuote });
  const [repricing, startRepricing] = useTransition();
  const [state, dispatch, booking] = useActionState(bookCar, {} as BookState);
  const quote = priced.quote ?? initialQuote;
  const [paymentMethod, setPaymentMethod] = useState(paymentMethods[0]);

  // Only the newest price counts when changes come quickly one after another.
  const latestQuote = useRef(0);

  // Recalculate the price after an extra or the coupon changes. The server decides the price.
  function reprice() {
    if (!formRef.current) {
      return;
    }
    const formData = new FormData(formRef.current);
    const request = ++latestQuote.current;
    startRepricing(async () => {
      const result = await quoteBooking(formData);
      if (request === latestQuote.current) {
        setPriced(result);
      }
    });
  }

  // Enter in the coupon field applies the coupon instead of sending the booking.
  function applyCouponOnEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      reprice();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  const couponError = state.couponError ?? priced.couponError;

  return (
    <form
      ref={formRef}
      action={dispatch}
      onSubmit={handleSubmit}
      className="grid gap-8 lg:grid-cols-[3fr_2fr]"
    >
      {Object.entries(request).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      <div className="space-y-8">
        {extras.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Extras</h2>
            <ul className="divide-y divide-border rounded-xl border border-border">
              {extras.map((extra) => {
                const name = `${EXTRA_FIELD_PREFIX}${extra.id}`;
                const price = `${formatMoney(extra.price, currency)} ${extra.charge === "per_day" ? "per day" : "once"}`;
                return (
                  <li key={extra.id} className="flex items-center justify-between gap-4 p-4">
                    <label htmlFor={name} className="min-w-0 flex-1 cursor-pointer">
                      <span className="block font-medium">{extra.name}</span>
                      <span className="block text-sm text-muted-foreground">
                        {price}
                        {extra.description && ` · ${extra.description}`}
                      </span>
                    </label>
                    {extra.maxQuantity > 1 ? (
                      <Select
                        id={name}
                        name={name}
                        defaultValue="0"
                        onChange={reprice}
                        className="w-20"
                      >
                        {quantities(extra.maxQuantity).map((count) => (
                          <option key={count} value={count}>
                            {count}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <input
                        id={name}
                        name={name}
                        type="checkbox"
                        value="1"
                        onChange={reprice}
                        className="h-5 w-5 accent-[var(--primary)]"
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Your details</h2>
          <Field label="Mobile phone" htmlFor="phone" hint="So we can reach you about your rental.">
            <Input
              id="phone"
              name="phone"
              type="tel"
              required
              autoComplete="tel"
              defaultValue={phone}
              className="sm:max-w-64"
            />
          </Field>
          {minDriverAge && (
            <Field
              label="Driver's date of birth"
              htmlFor="dateOfBirth"
              hint={`The driver must be at least ${minDriverAge} on the pickup date.`}
            >
              <Input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                required
                className="sm:max-w-64"
              />
            </Field>
          )}
          <Field label="Note for us" htmlFor="note" hint="Optional, e.g. your flight number.">
            <Textarea id="note" name="note" maxLength={500} className="min-h-16" />
          </Field>
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-2xl border border-border p-5 space-y-4">
          <h2 className="text-lg font-semibold">Price</h2>
          <div className={repricing ? "opacity-50" : undefined} aria-busy={repricing}>
            <QuoteBreakdown
              quote={quote}
              currency={currency}
              taxName={taxName}
              taxRate={taxRate}
              couponCode={priced.couponCode}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="coupon" className="block text-sm font-medium">
              Coupon code
            </label>
            <div className="flex gap-2">
              <Input
                id="coupon"
                name="coupon"
                maxLength={30}
                className="uppercase"
                onKeyDown={applyCouponOnEnter}
              />
              <Button type="button" variant="outline" onClick={reprice}>
                Apply
              </Button>
            </div>
            {couponError && <p className="text-sm text-danger">{couponError}</p>}
          </div>
          {paymentMethods.length > 1 ? (
            <fieldset className="space-y-2">
              <legend className="mb-1 text-sm font-medium">How would you like to pay?</legend>
              {paymentMethods.map((method) => (
                <label
                  key={method}
                  className="flex cursor-pointer items-start gap-2 rounded-lg border border-border p-3 text-sm has-[:checked]:border-primary"
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method}
                    checked={paymentMethod === method}
                    onChange={() => setPaymentMethod(method)}
                    className="mt-0.5 accent-[var(--primary)]"
                  />
                  <span>
                    <span className="block font-medium">{paymentLabels[method].title}</span>
                    <span className="block text-muted-foreground">
                      {paymentLabels[method].text}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
          ) : (
            <>
              <input type="hidden" name="paymentMethod" value={paymentMethod} />
              <p className="text-sm text-muted-foreground">
                {paymentLabels[paymentMethod].title}. {paymentLabels[paymentMethod].text}
              </p>
            </>
          )}
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              name="acceptTerms"
              required
              className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
            />
            <span>
              I accept the{" "}
              <Link href="/terms" target="_blank" className="text-link underline">
                rental terms
              </Link>
              .
            </span>
          </label>
          <FormMessage error={state.error ?? priced.error} />
          <Button size="full" disabled={booking || repricing}>
            {booking ? "Booking..." : paymentMethod === "online" ? "Book and pay" : "Book now"}
          </Button>
        </div>
      </aside>
    </form>
  );
}
