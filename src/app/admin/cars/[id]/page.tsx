import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteForm } from "@/components/admin/delete-form";
import { Card, PageHeader } from "@/components/admin/page-header";
import { VehicleStatusBadge } from "@/components/admin/vehicle-status-badge";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { carModelName } from "@/lib/fleet/labels";
import { getCarModel, listVehicles } from "@/lib/fleet/queries";
import { can } from "@/lib/permissions";
import { requireStaff } from "@/lib/session";
import { isUuid } from "@/lib/uuid";
import { deleteCarModel, setCarModelActive, updateCarModel } from "../actions";
import { CarModelForm } from "../car-model-form";

export const metadata: Metadata = { title: "Car model" };

export default async function CarModelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }
  const [user, model, modelVehicles] = await Promise.all([
    requireStaff(),
    getCarModel(id),
    listVehicles({ carModelId: id }),
  ]);
  if (!model) {
    notFound();
  }
  const canManage = can(user.role, "fleet:manage");
  const name = carModelName(model);

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title={name}
        back={{ label: "Cars", href: "/admin/cars" }}
        description={!model.active && <Badge>Hidden from the website</Badge>}
      />

      <Card title={`Vehicles (${modelVehicles.length})`}>
        {modelVehicles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No vehicles yet. Customers can only book this model once it has at least one.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {modelVehicles.map((vehicle) => (
              <li key={vehicle.id}>
                <Link
                  href={`/admin/vehicles/${vehicle.id}`}
                  className="flex items-center justify-between gap-3 py-2 hover:underline"
                >
                  <span className="font-mono text-sm">{vehicle.plate}</span>
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    {vehicle.locationName}
                    <VehicleStatusBadge status={vehicle.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {canManage && (
          <ButtonLink
            href={`/admin/vehicles/new?model=${model.id}`}
            variant="outline"
            className="mt-4"
          >
            Add vehicle
          </ButtonLink>
        )}
      </Card>

      {canManage && (
        <>
          <Card title="Details">
            <CarModelForm
              action={updateCarModel.bind(null, model.id)}
              values={model}
              submitLabel="Save car model"
            />
          </Card>

          <Card title={model.active ? "Hide from the website" : "Show on the website"}>
            <p className="mb-3 text-sm text-muted-foreground">
              {model.active
                ? "Customers can no longer book this model. Existing bookings stay."
                : "Customers can book this model again."}
            </p>
            <form action={setCarModelActive}>
              <input type="hidden" name="id" value={model.id} />
              <input type="hidden" name="active" value={String(!model.active)} />
              <SubmitButton variant="outline" pendingText="Saving...">
                {model.active ? "Hide model" : "Show model"}
              </SubmitButton>
            </form>
          </Card>

          {modelVehicles.length === 0 && (
            <Card title="Delete">
              <DeleteForm
                action={deleteCarModel}
                fields={{ id: model.id }}
                confirm={`Delete ${name} and its photos? This can't be undone.`}
                label="Delete car model"
              />
            </Card>
          )}
        </>
      )}
    </div>
  );
}
