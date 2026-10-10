import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { VehicleStatusBadge } from "@/components/admin/vehicle-status-badge";
import { ButtonLink, buttonClasses } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { carModelName, isOneOf, vehicleStatusLabels } from "@/lib/fleet/labels";
import { carModelOptions, listVehicles, locationOptions } from "@/lib/fleet/queries";
import { can } from "@/lib/permissions";
import { requireStaff } from "@/lib/session";
import { requireSettings } from "@/lib/settings";
import { firstParam, type RawSearchParams } from "@/lib/url-params";
import { isUuid } from "@/lib/uuid";

export const metadata: Metadata = { title: "Vehicles" };

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;
  const locationId = firstParam(params.location) ?? "";
  const carModelId = firstParam(params.model) ?? "";
  const status = firstParam(params.status) ?? "";
  const filters = {
    locationId: isUuid(locationId) ? locationId : undefined,
    carModelId: isUuid(carModelId) ? carModelId : undefined,
    status: isOneOf(vehicleStatusLabels, status) ? status : undefined,
  };

  const [user, settings, vehicleList, locations, models] = await Promise.all([
    requireStaff(),
    requireSettings(),
    listVehicles(filters),
    locationOptions(),
    carModelOptions(),
  ]);
  const filtered = Boolean(filters.locationId || filters.carModelId || filters.status);

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Vehicles"
        description="Every car with a number plate, where it is and whether it can be rented."
        action={
          can(user.role, "fleet:manage") && (
            <ButtonLink href="/admin/vehicles/new">Add vehicle</ButtonLink>
          )
        }
      />

      <form className="mb-4 flex flex-wrap gap-2">
        <Select name="location" defaultValue={filters.locationId ?? ""} aria-label="Location">
          <option value="">All locations</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </Select>
        <Select name="model" defaultValue={filters.carModelId ?? ""} aria-label="Car model">
          <option value="">All models</option>
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {carModelName(model)}
            </option>
          ))}
        </Select>
        <Select name="status" defaultValue={filters.status ?? ""} aria-label="Status">
          <option value="">Any status</option>
          {Object.entries(vehicleStatusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <button type="submit" className={buttonClasses({ variant: "outline" })}>
          Filter
        </button>
        {filtered && (
          <Link
            href="/admin/vehicles"
            className={buttonClasses({ variant: "link", size: "inline" })}
          >
            Clear
          </Link>
        )}
      </form>

      {vehicleList.length === 0 ? (
        <EmptyState title={filtered ? "No vehicles match these filters" : "No vehicles yet"}>
          {!filtered && "Add a car model first, then its vehicles."}
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Plate</th>
                <th className="px-4 py-2 font-medium">Model</th>
                <th className="px-4 py-2 font-medium">Location</th>
                <th className="px-4 py-2 font-medium text-right">Mileage</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {vehicleList.map((vehicle) => (
                <tr key={vehicle.id} className="hover:bg-muted">
                  <td className="px-4 py-2">
                    <Link
                      href={`/admin/vehicles/${vehicle.id}`}
                      className="font-mono text-link hover:underline"
                    >
                      {vehicle.plate}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{carModelName(vehicle)}</td>
                  <td className="px-4 py-2">{vehicle.locationName}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {vehicle.mileage.toLocaleString("en-US")} {settings.distanceUnit}
                  </td>
                  <td className="px-4 py-2">
                    <VehicleStatusBadge status={vehicle.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
