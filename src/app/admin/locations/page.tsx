import type { Metadata } from "next";
import Link from "next/link";
import { Card, EmptyState, PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { listLocations } from "@/lib/fleet/queries";
import { can } from "@/lib/permissions";
import { requireStaff } from "@/lib/session";
import { requireSettings } from "@/lib/settings";
import { createLocation } from "./actions";
import { LocationForm } from "./location-form";

export const metadata: Metadata = { title: "Locations" };

export default async function LocationsPage() {
  const [user, settings, all] = await Promise.all([
    requireStaff(),
    requireSettings(),
    listLocations(),
  ]);
  const canManage = can(user.role, "fleet:manage");

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader
        title="Locations"
        description="Your branches, where customers pick up and return cars."
      />

      {all.length === 0 ? (
        <EmptyState title="No locations yet">
          Add your first branch below. Every car is based at a location.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {all.map((location) => (
            <li key={location.id}>
              <Link
                href={`/admin/locations/${location.id}`}
                className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-muted"
              >
                <div className="min-w-0">
                  <p className="font-medium">{location.name}</p>
                  {location.address && (
                    <p className="truncate text-sm text-subtle-foreground">{location.address}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {location.vehicleCount} {location.vehicleCount === 1 ? "vehicle" : "vehicles"}
                  {!location.active && <Badge>Inactive</Badge>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <Card title="Add a location">
          <LocationForm
            action={createLocation}
            currency={settings.currency}
            submitLabel="Add location"
          />
        </Card>
      )}
    </div>
  );
}
