import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { BUSINESS_NAME_MAX } from "@/lib/business-input";

type Values = {
  businessName?: string;
  currency?: string;
  timeZone?: string;
  distanceUnit?: string;
  contactEmail?: string | null;
};

// Built once per server start: about 400 time zones and 300 currencies.
// Some systems leave "UTC" out of the list, but it's the default, so it must be there.
const zoneList = Intl.supportedValuesOf("timeZone");
const timeZones = zoneList.includes("UTC") ? zoneList : ["UTC", ...zoneList];
const currencyNames = new Intl.DisplayNames(["en"], { type: "currency" });
const currencies = Intl.supportedValuesOf("currency").map((code) => ({
  code,
  name: currencyNames.of(code) ?? code,
}));

// Business name, currency, time zone and contact email: shared by the setup wizard and the
// Settings page, so both check and show the same things.
// `currencyLocked`: prices already exist in the current currency (see currencyInUse).
export function BusinessFields({
  values = {},
  currencyLocked = false,
}: {
  values?: Values;
  currencyLocked?: boolean;
}) {
  return (
    <>
      <Field label="Business name" htmlFor="businessName">
        <Input
          id="businessName"
          name="businessName"
          required
          maxLength={BUSINESS_NAME_MAX}
          defaultValue={values.businessName}
          placeholder="City Car Rentals"
          autoComplete="organization"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Currency"
          htmlFor="currency"
          hint={
            currencyLocked
              ? "Fixed once prices or bookings exist: every price is stored in it."
              : "Every price is shown in this currency."
          }
        >
          {/* A disabled field isn't sent with the form, so the value goes along hidden. */}
          {currencyLocked && <input type="hidden" name="currency" value={values.currency} />}
          <Select
            id="currency"
            name={currencyLocked ? undefined : "currency"}
            defaultValue={values.currency ?? "USD"}
            disabled={currencyLocked}
            className="w-full"
          >
            {currencies.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.code} · {currency.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Time zone" htmlFor="timeZone" hint="Pickup and return times use this zone.">
          <Select
            id="timeZone"
            name="timeZone"
            defaultValue={values.timeZone ?? "UTC"}
            className="w-full"
          >
            {timeZones.map((zone) => (
              <option key={zone} value={zone}>
                {zone.replaceAll("_", " ")}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field
        label="Distance unit"
        htmlFor="distanceUnit"
        hint="For odometer readings and mileage limits."
      >
        <Select
          id="distanceUnit"
          name="distanceUnit"
          defaultValue={values.distanceUnit ?? "km"}
          className="w-full sm:w-1/2"
        >
          <option value="km">Kilometers (km)</option>
          <option value="mi">Miles (mi)</option>
        </Select>
      </Field>
      <Field
        label="Contact email"
        htmlFor="contactEmail"
        hint="Shown to customers, and replies to emails go here."
      >
        <Input
          id="contactEmail"
          name="contactEmail"
          type="email"
          defaultValue={values.contactEmail ?? ""}
          placeholder="hello@yourbusiness.com"
        />
      </Field>
    </>
  );
}
