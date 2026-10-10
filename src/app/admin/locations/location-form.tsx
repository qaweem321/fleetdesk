import { ActionForm, ActionMessage } from "@/components/ui/action-form";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/action-state";

type Props = {
  action: (previous: ActionState, formData: FormData) => Promise<ActionState>;
  values?: { name: string; address: string | null; phone: string | null; dropOffFee: number };
  currency: string;
  submitLabel: string;
};

export function LocationForm({ action, values, currency, submitLabel }: Props) {
  return (
    <ActionForm action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="location-name">
          <Input
            id="location-name"
            name="name"
            required
            maxLength={80}
            defaultValue={values?.name}
            placeholder="Airport desk"
          />
        </Field>
        <Field label="Phone" htmlFor="location-phone">
          <Input
            id="location-phone"
            name="phone"
            type="tel"
            maxLength={40}
            defaultValue={values?.phone ?? ""}
          />
        </Field>
      </div>
      <Field
        label="Address"
        htmlFor="location-address"
        hint="Shown to customers with pickup instructions."
      >
        <Textarea
          id="location-address"
          name="address"
          maxLength={300}
          defaultValue={values?.address ?? ""}
          className="min-h-16"
        />
      </Field>
      <Field
        label="Drop-off fee"
        htmlFor="location-drop-off-fee"
        hint="Charged when a car picked up at another location is returned here. Empty: free."
      >
        <MoneyInput
          id="location-drop-off-fee"
          name="dropOffFee"
          currency={currency}
          amount={values?.dropOffFee || null}
          placeholder="0.00"
          className="sm:max-w-40"
        />
      </Field>
      <ActionMessage />
      <SubmitButton pendingText="Saving...">{submitLabel}</SubmitButton>
    </ActionForm>
  );
}
