import { buttonClasses } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { TIME_OPTIONS } from "@/lib/bookings/search";

type Props = {
  locations: { id: string; name: string }[];
  values: {
    pickupLocationId?: string;
    returnLocationId?: string;
    pickupAt?: string;
    returnAt?: string;
  };
  // Where the form goes: the car list, or the same car page with new dates.
  action?: string;
};

function TimeSelect({ id, name, value }: { id: string; name: string; value: string }) {
  return (
    <Select id={id} name={name} defaultValue={value || "10:00"} aria-label="Time" className="w-28">
      {TIME_OPTIONS.map((time) => (
        <option key={time} value={time}>
          {time}
        </option>
      ))}
    </Select>
  );
}

// "Where and when?": pickup and return location, dates and times. A plain form that sends the
// search in the web address, so it works without JavaScript and results can be shared.
export function SearchForm({ locations, values, action = "/cars" }: Props) {
  const [pickupDate = "", pickupTime = ""] = (values.pickupAt ?? "").split("T");
  const [returnDate = "", returnTime = ""] = (values.returnAt ?? "").split("T");
  const differentReturn =
    values.returnLocationId && values.returnLocationId !== values.pickupLocationId;

  return (
    <form
      action={action}
      className="grid gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6 md:grid-cols-2 xl:grid-cols-[1fr_1fr_auto_auto_auto]"
    >
      <Field label="Pick up at" htmlFor="search-pickup-location">
        <Select
          id="search-pickup-location"
          name="pickupLocationId"
          required
          defaultValue={values.pickupLocationId ?? locations[0]?.id ?? ""}
          className="w-full"
        >
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Return to" htmlFor="search-return-location">
        <Select
          id="search-return-location"
          name="returnLocationId"
          defaultValue={differentReturn ? values.returnLocationId : ""}
          className="w-full"
        >
          <option value="">Same location</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Pickup" htmlFor="search-pickup-date">
        <div className="flex gap-2">
          <Input
            id="search-pickup-date"
            name="pickupDate"
            type="date"
            required
            defaultValue={pickupDate}
            className="min-w-0 flex-1"
          />
          <TimeSelect id="search-pickup-time" name="pickupTime" value={pickupTime} />
        </div>
      </Field>
      <Field label="Return" htmlFor="search-return-date">
        <div className="flex gap-2">
          <Input
            id="search-return-date"
            name="returnDate"
            type="date"
            required
            defaultValue={returnDate}
            className="min-w-0 flex-1"
          />
          <TimeSelect id="search-return-time" name="returnTime" value={returnTime} />
        </div>
      </Field>
      <div className="flex items-end md:col-span-2 xl:col-span-1">
        <button type="submit" className={buttonClasses({ size: "lg", className: "w-full" })}>
          Find a car
        </button>
      </div>
    </form>
  );
}
