"use client";

import { type FormEvent, startTransition, useActionState } from "react";
import { QuoteBreakdown } from "@/components/quote-breakdown";
import { Button } from "@/components/ui/button";
import { Field, FormMessage } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { EXTRA_FIELD_PREFIX } from "@/lib/pricing/request";
import { type PreviewState, previewQuote } from "./actions";

type Option = { id: string; name: string };

type Props = {
  models: Option[];
  locations: Option[];
  extras: (Option & { maxQuantity: number })[];
  currency: string;
  taxName: string;
  taxRate: number;
};

// Try any car, dates, extras and coupon and see the price a customer would get.
export function QuoteCalculator({ models, locations, extras, currency, taxName, taxRate }: Props) {
  const [state, dispatch, pending] = useActionState(previewQuote, {} as PreviewState);

  // Sent without resetting the form, so staff can change one thing and calculate again.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <form action={dispatch} onSubmit={handleSubmit} className="space-y-3">
        <Field label="Car model" htmlFor="quote-model">
          <Select id="quote-model" name="carModelId" required className="w-full" defaultValue="">
            <option value="" disabled>
              Choose...
            </option>
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Pickup at" htmlFor="quote-pickup-location">
            <Select id="quote-pickup-location" name="pickupLocationId" required className="w-full">
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Return at" htmlFor="quote-return-location">
            <Select id="quote-return-location" name="returnLocationId" className="w-full">
              <option value="">Same location</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Pickup" htmlFor="quote-pickup">
            <Input id="quote-pickup" name="pickupAt" type="datetime-local" required />
          </Field>
          <Field label="Return" htmlFor="quote-return">
            <Input id="quote-return" name="returnAt" type="datetime-local" required />
          </Field>
        </div>
        {extras.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {extras.map((extra) => (
              <Field key={extra.id} label={extra.name} htmlFor={`quote-extra-${extra.id}`}>
                <Input
                  id={`quote-extra-${extra.id}`}
                  name={`${EXTRA_FIELD_PREFIX}${extra.id}`}
                  type="number"
                  min={0}
                  max={extra.maxQuantity}
                  defaultValue={0}
                />
              </Field>
            ))}
          </div>
        )}
        <Field label="Coupon" htmlFor="quote-coupon">
          <Input id="quote-coupon" name="coupon" className="uppercase" />
        </Field>
        <Button variant="outline" disabled={pending}>
          {pending ? "Calculating..." : "Calculate price"}
        </Button>
      </form>

      <div className="rounded-lg bg-muted p-4">
        {state.quote ? (
          <>
            <QuoteBreakdown
              quote={state.quote}
              currency={currency}
              taxName={taxName}
              taxRate={taxRate}
              couponCode={state.couponCode}
            />
            {state.couponError && (
              <p className="mt-3 text-sm text-danger">Coupon: {state.couponError}</p>
            )}
          </>
        ) : (
          <>
            <FormMessage error={state.error} />
            {!state.error && (
              <p className="text-sm text-muted-foreground">The price breakdown appears here.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
