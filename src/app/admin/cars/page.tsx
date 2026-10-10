import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { CarPhoto } from "@/components/car-photo";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { carClassLabels, carModelName, transmissionLabels } from "@/lib/fleet/labels";
import { listCarModels } from "@/lib/fleet/queries";
import { can } from "@/lib/permissions";
import { requireStaff } from "@/lib/session";

export const metadata: Metadata = { title: "Cars" };

export default async function CarsPage() {
  const [user, models] = await Promise.all([requireStaff(), listCarModels()]);
  const canManage = can(user.role, "fleet:manage");

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Cars"
        description="The car models customers can book. Each model has one or more vehicles."
        action={canManage && <ButtonLink href="/admin/cars/new">Add car model</ButtonLink>}
      />

      {models.length === 0 ? (
        <EmptyState title="No car models yet">
          Add a model like &quot;Toyota Corolla&quot;, then add its vehicles (number plates).
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {models.map((model) => (
            <li key={model.id}>
              <Link
                href={`/admin/cars/${model.id}`}
                className="flex gap-4 rounded-xl border border-border p-3 hover:bg-muted"
              >
                <CarPhoto url={model.photoUrl} alt="" className="h-20 w-28 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium">{carModelName(model)}</p>
                  <p className="text-sm text-muted-foreground">
                    {carClassLabels[model.carClass]} · {transmissionLabels[model.transmission]} ·{" "}
                    {model.seats} seats
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-sm text-subtle-foreground">
                    {model.vehicleCount} {model.vehicleCount === 1 ? "vehicle" : "vehicles"}
                    {!model.active && <Badge>Hidden</Badge>}
                    {model.vehicleCount === 0 && model.active && (
                      <Badge tone="warning">No vehicles</Badge>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
