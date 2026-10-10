import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { requireStaff } from "@/lib/session";
import { requireSettings } from "@/lib/settings";
import { firstParam, type RawSearchParams } from "@/lib/url-params";
import { createVehicle } from "../actions";
import { vehicleFormOptions } from "../options";
import { VehicleForm } from "../vehicle-form";

export const metadata: Metadata = { title: "Add vehicle" };

export default async function NewVehiclePage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const [, settings, options, params] = await Promise.all([
    requireStaff("fleet:manage"),
    requireSettings(),
    vehicleFormOptions(),
    searchParams,
  ]);
  const model = firstParam(params.model);

  return (
    <div className="max-w-3xl">
      <PageHeader title="Add a vehicle" back={{ label: "Vehicles", href: "/admin/vehicles" }} />
      {options.models.length === 0 || options.locations.length === 0 ? (
        <EmptyState title="First add a car model and a location">
          Every vehicle belongs to a{" "}
          <Link href="/admin/cars/new" className="text-link underline">
            car model
          </Link>{" "}
          and is based at a{" "}
          <Link href="/admin/locations" className="text-link underline">
            location
          </Link>
          .
        </EmptyState>
      ) : (
        <VehicleForm
          action={createVehicle}
          values={{
            carModelId: options.models.some((option) => option.id === model) ? model : undefined,
            locationId: options.locations.length === 1 ? options.locations[0].id : undefined,
          }}
          models={options.models}
          locations={options.locations}
          distanceUnit={settings.distanceUnit}
          submitLabel="Add vehicle"
        />
      )}
    </div>
  );
}
