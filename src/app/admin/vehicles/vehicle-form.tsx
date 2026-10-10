import { ActionForm, ActionMessage } from "@/components/ui/action-form";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/action-state";
import type { VehicleInput } from "@/lib/fleet/input";
import { vehicleStatusLabels } from "@/lib/fleet/labels";

type Option = { id: string; name: string };

type Props = {
  action: (previous: ActionState, formData: FormData) => Promise<ActionState>;
  values?: Partial<VehicleInput>;
  models: Option[];
  locations: Option[];
  distanceUnit: "km" | "mi";
  submitLabel: string;
};

export function VehicleForm({
  action,
  values,
  models,
  locations,
  distanceUnit,
  submitLabel,
}: Props) {
  return (
    <ActionForm action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Car model" htmlFor="carModelId">
          <Select
            id="carModelId"
            name="carModelId"
            required
            defaultValue={values?.carModelId ?? ""}
            className="w-full"
          >
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
        <Field label="Location" htmlFor="locationId" hint="Where the car is based now.">
          <Select
            id="locationId"
            name="locationId"
            required
            defaultValue={values?.locationId ?? ""}
            className="w-full"
          >
            <option value="" disabled>
              Choose...
            </option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Number plate" htmlFor="plate">
          <Input
            id="plate"
            name="plate"
            required
            maxLength={20}
            defaultValue={values?.plate}
            className="font-mono uppercase"
          />
        </Field>
        <Field label="Year" htmlFor="year">
          <Input
            id="year"
            name="year"
            type="number"
            min={1950}
            max={2100}
            defaultValue={values?.year ?? ""}
          />
        </Field>
        <Field label="Color" htmlFor="color">
          <Input id="color" name="color" maxLength={40} defaultValue={values?.color ?? ""} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label={`Mileage (${distanceUnit})`}
          htmlFor="mileage"
          hint="Updated at every return."
        >
          <Input
            id="mileage"
            name="mileage"
            type="number"
            min={0}
            defaultValue={values?.mileage ?? 0}
          />
        </Field>
        <Field label="Status" htmlFor="status">
          <Select
            id="status"
            name="status"
            defaultValue={values?.status ?? "available"}
            className="w-full"
          >
            {Object.entries(vehicleStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="VIN" htmlFor="vin" hint="Optional.">
          <Input
            id="vin"
            name="vin"
            maxLength={30}
            defaultValue={values?.vin ?? ""}
            className="font-mono uppercase"
          />
        </Field>
      </div>
      <Field label="Notes" htmlFor="notes" hint="Only staff see these.">
        <Textarea
          id="notes"
          name="notes"
          maxLength={2000}
          defaultValue={values?.notes ?? ""}
          className="min-h-16"
        />
      </Field>
      <ActionMessage />
      <SubmitButton pendingText="Saving...">{submitLabel}</SubmitButton>
    </ActionForm>
  );
}
