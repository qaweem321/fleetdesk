import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteForm } from "@/components/admin/delete-form";
import { Card, PageHeader } from "@/components/admin/page-header";
import { VehicleStatusBadge } from "@/components/admin/vehicle-status-badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { carModelName } from "@/lib/fleet/labels";
import { getVehicle } from "@/lib/fleet/queries";
import { formatDateTime } from "@/lib/format";
import { can } from "@/lib/permissions";
import { requireStaff } from "@/lib/session";
import { requireSettings } from "@/lib/settings";
import { isUuid } from "@/lib/uuid";
import { addBlock, deleteVehicle, removeBlock, updateVehicle } from "../actions";
import { BlockForm } from "../block-form";
import { vehicleFormOptions } from "../options";
import { VehicleForm } from "../vehicle-form";

export const metadata: Metadata = { title: "Vehicle" };

export default async function VehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }
  const [user, settings, vehicle, options] = await Promise.all([
    requireStaff(),
    requireSettings(),
    getVehicle(id),
    vehicleFormOptions(),
  ]);
  if (!vehicle) {
    notFound();
  }
  const canManage = can(user.role, "fleet:manage");
  const now = new Date();
  const upcomingBlocks = vehicle.blocks.filter((block) => block.endsAt > now);

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title={vehicle.plate}
        back={{ label: "Vehicles", href: "/admin/vehicles" }}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Link href={`/admin/cars/${vehicle.carModelId}`} className="hover:underline">
              {carModelName(vehicle)}
            </Link>
            · {vehicle.locationName} · {vehicle.mileage.toLocaleString("en-US")}{" "}
            {settings.distanceUnit}
            <VehicleStatusBadge status={vehicle.status} />
          </span>
        }
      />

      <Card title="Blocked dates">
        <p className="mb-3 text-sm text-muted-foreground">
          Times this vehicle can&apos;t be rented, like a planned service. Times are in{" "}
          {settings.timeZone.replaceAll("_", " ")}.
        </p>
        {upcomingBlocks.length > 0 && (
          <ul className="mb-4 divide-y divide-border rounded-lg border border-border">
            {upcomingBlocks.map((block) => (
              <li
                key={block.id}
                className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{block.reason}</p>
                  <p className="text-muted-foreground">
                    {formatDateTime(block.startsAt, settings.timeZone)} –{" "}
                    {formatDateTime(block.endsAt, settings.timeZone)}
                  </p>
                </div>
                {canManage && (
                  <form action={removeBlock}>
                    <input type="hidden" name="vehicleId" value={vehicle.id} />
                    <input type="hidden" name="blockId" value={block.id} />
                    <SubmitButton
                      variant="danger-link"
                      size="inline"
                      pendingText="Removing..."
                      confirm={`Remove the block "${block.reason}"?`}
                    >
                      Remove
                    </SubmitButton>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
        {canManage && <BlockForm action={addBlock.bind(null, vehicle.id)} />}
      </Card>

      {canManage && (
        <>
          <Card title="Details">
            <VehicleForm
              action={updateVehicle.bind(null, vehicle.id)}
              values={vehicle}
              models={options.models}
              locations={options.locations}
              distanceUnit={settings.distanceUnit}
              submitLabel="Save vehicle"
            />
          </Card>
          <Card title="Delete">
            <p className="mb-3 text-sm text-muted-foreground">
              Only possible for a vehicle that was never booked. Otherwise set its status to
              Retired: it stays in your history but is never offered again.
            </p>
            <DeleteForm
              action={deleteVehicle}
              fields={{ id: vehicle.id }}
              confirm={`Delete ${vehicle.plate}? This can't be undone.`}
              label="Delete vehicle"
            />
          </Card>
        </>
      )}
    </div>
  );
}
