import { PhotoUpload, type UploadedPhoto } from "@/components/photo-upload";
import { ActionForm, ActionMessage } from "@/components/ui/action-form";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/action-state";
import type { CarModelInput } from "@/lib/fleet/input";
import { carClassLabels, fuelTypeLabels, transmissionLabels } from "@/lib/fleet/labels";
import { uploadPublicPhoto } from "../uploads";

type Props = {
  action: (previous: ActionState, formData: FormData) => Promise<ActionState>;
  values?: CarModelInput & { photos: UploadedPhoto[] };
  currency: string;
  distanceUnit: "km" | "mi";
  submitLabel: string;
};

function Options({ labels }: { labels: Record<string, string> }) {
  return Object.entries(labels).map(([value, label]) => (
    <option key={value} value={value}>
      {label}
    </option>
  ));
}

export function CarModelForm({ action, values, currency, distanceUnit, submitLabel }: Props) {
  return (
    <ActionForm action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Make" htmlFor="make">
          <Input
            id="make"
            name="make"
            required
            maxLength={80}
            defaultValue={values?.make}
            placeholder="Toyota"
          />
        </Field>
        <Field label="Model" htmlFor="model">
          <Input
            id="model"
            name="model"
            required
            maxLength={80}
            defaultValue={values?.model}
            placeholder="Corolla"
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Class" htmlFor="carClass">
          <Select
            id="carClass"
            name="carClass"
            defaultValue={values?.carClass ?? "compact"}
            className="w-full"
          >
            <Options labels={carClassLabels} />
          </Select>
        </Field>
        <Field label="Transmission" htmlFor="transmission">
          <Select
            id="transmission"
            name="transmission"
            defaultValue={values?.transmission ?? "automatic"}
            className="w-full"
          >
            <Options labels={transmissionLabels} />
          </Select>
        </Field>
        <Field label="Fuel" htmlFor="fuelType">
          <Select
            id="fuelType"
            name="fuelType"
            defaultValue={values?.fuelType ?? "petrol"}
            className="w-full"
          >
            <Options labels={fuelTypeLabels} />
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Seats" htmlFor="seats">
          <Input
            id="seats"
            name="seats"
            type="number"
            min={1}
            max={60}
            required
            defaultValue={values?.seats ?? 5}
          />
        </Field>
        <Field label="Doors" htmlFor="doors">
          <Input
            id="doors"
            name="doors"
            type="number"
            min={0}
            max={10}
            required
            defaultValue={values?.doors ?? 4}
          />
        </Field>
        <Field label="Bags" htmlFor="bags" hint="Large suitcases that fit.">
          <Input
            id="bags"
            name="bags"
            type="number"
            min={0}
            max={20}
            required
            defaultValue={values?.bags ?? 2}
          />
        </Field>
      </div>
      <Field label="Description" htmlFor="description" hint="Shown on the car's page. Optional.">
        <Textarea
          id="description"
          name="description"
          maxLength={2000}
          defaultValue={values?.description ?? ""}
        />
      </Field>
      <fieldset className="space-y-4 rounded-lg border border-border p-4">
        <legend className="px-1 text-sm font-semibold">Prices</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Per day" htmlFor="dailyRate">
            <MoneyInput
              id="dailyRate"
              name="dailyRate"
              required
              currency={currency}
              amount={values?.dailyRate}
              placeholder="49.00"
            />
          </Field>
          <Field label="Per week" htmlFor="weeklyRate" hint="Used for 7+ days. Optional.">
            <MoneyInput
              id="weeklyRate"
              name="weeklyRate"
              currency={currency}
              amount={values?.weeklyRate}
              placeholder="290.00"
            />
          </Field>
          <Field
            label="Deposit"
            htmlFor="depositAmount"
            hint="Held at pickup, released after return."
          >
            <MoneyInput
              id="depositAmount"
              name="depositAmount"
              currency={currency}
              amount={values?.depositAmount}
              placeholder="300.00"
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={`Included ${distanceUnit} per day`}
            htmlFor="includedDistancePerDay"
            hint="Empty means unlimited."
          >
            <Input
              id="includedDistancePerDay"
              name="includedDistancePerDay"
              type="number"
              min={1}
              defaultValue={values?.includedDistancePerDay ?? ""}
              placeholder="Unlimited"
            />
          </Field>
          <Field label={`Price per extra ${distanceUnit}`} htmlFor="extraDistanceFee">
            <MoneyInput
              id="extraDistanceFee"
              name="extraDistanceFee"
              currency={currency}
              amount={values?.extraDistanceFee}
              placeholder="0.25"
            />
          </Field>
        </div>
      </fieldset>
      <Field label="Photos" htmlFor="photos" hint="The first photo is the main one. Up to 12.">
        <PhotoUpload name="photos" upload={uploadPublicPhoto} initial={values?.photos} max={12} />
      </Field>
      <ActionMessage />
      <SubmitButton pendingText="Saving...">{submitLabel}</SubmitButton>
    </ActionForm>
  );
}
