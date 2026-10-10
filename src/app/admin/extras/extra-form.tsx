import { ActionForm, ActionMessage } from "@/components/ui/action-form";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/action-state";
import type { ExtraInput } from "@/lib/pricing/input";

type Props = {
  action: (previous: ActionState, formData: FormData) => Promise<ActionState>;
  values?: ExtraInput;
  currency: string;
  submitLabel: string;
  // Empty the form after adding, ready for the next one.
  resetOnSuccess?: boolean;
};

export function ExtraForm({ action, values, currency, submitLabel, resetOnSuccess }: Props) {
  return (
    <ActionForm action={action} resetOnSuccess={resetOnSuccess} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="extra-name">
          <Input
            id="extra-name"
            name="name"
            required
            maxLength={60}
            defaultValue={values?.name}
            placeholder="Child seat"
          />
        </Field>
        <Field label="Description" htmlFor="extra-description" hint="Optional, shown to customers.">
          <Input
            id="extra-description"
            name="description"
            maxLength={300}
            defaultValue={values?.description ?? ""}
            placeholder="For children from 9 to 18 kg"
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Price" htmlFor="extra-price">
          <MoneyInput
            id="extra-price"
            name="price"
            required
            currency={currency}
            amount={values?.price}
            placeholder="8.00"
          />
        </Field>
        <Field label="Charged" htmlFor="extra-charge">
          <Select
            id="extra-charge"
            name="charge"
            defaultValue={values?.charge ?? "per_day"}
            className="w-full"
          >
            <option value="per_day">Per day</option>
            <option value="per_rental">Once per rental</option>
          </Select>
        </Field>
        <Field label="Most per booking" htmlFor="extra-max" hint="e.g. 3 child seats">
          <Input
            id="extra-max"
            name="maxQuantity"
            type="number"
            min={1}
            max={10}
            defaultValue={values?.maxQuantity ?? 1}
          />
        </Field>
      </div>
      <ActionMessage />
      <SubmitButton pendingText="Saving...">{submitLabel}</SubmitButton>
    </ActionForm>
  );
}
