import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DeleteForm } from "@/components/admin/delete-form";
import { Card, PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { getLocation } from "@/lib/fleet/queries";
import { can } from "@/lib/permissions";
import { requireStaff } from "@/lib/session";
import { requireSettings } from "@/lib/settings";
import { isUuid } from "@/lib/uuid";
import { deleteLocation, setLocationActive, updateLocation } from "../actions";
import { LocationForm } from "../location-form";

export const metadata: Metadata = { title: "Location" };

export default async function LocationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, settings, location] = await Promise.all([
    requireStaff(),
    requireSettings(),
    isUuid(id) ? getLocation(id) : null,
  ]);
  if (!location) {
    notFound();
  }
  const canManage = can(user.role, "fleet:manage");

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title={location.name}
        back={{ label: "Locations", href: "/admin/locations" }}
        description={
          <>
            {location.vehicleCount} {location.vehicleCount === 1 ? "vehicle" : "vehicles"} based
            here {!location.active && <Badge>Inactive</Badge>}
          </>
        }
      />

      {canManage ? (
        <>
          <Card title="Details">
            <LocationForm
              action={updateLocation.bind(null, location.id)}
              values={location}
              currency={settings.currency}
              submitLabel="Save location"
            />
          </Card>

          <Card title={location.active ? "Deactivate" : "Activate"}>
            <p className="mb-3 text-sm text-muted-foreground">
              {location.active
                ? "Customers can no longer choose this location. Existing bookings and history stay."
                : "Customers can choose this location again."}
            </p>
            <form action={setLocationActive}>
              <input type="hidden" name="id" value={location.id} />
              <input type="hidden" name="active" value={String(!location.active)} />
              <SubmitButton variant="outline" pendingText="Saving...">
                {location.active ? "Deactivate location" : "Activate location"}
              </SubmitButton>
            </form>
          </Card>

          {location.vehicleCount === 0 && (
            <Card title="Delete">
              <p className="mb-3 text-sm text-muted-foreground">
                Only possible while nothing uses this location.
              </p>
              <DeleteForm
                action={deleteLocation}
                fields={{ id: location.id }}
                confirm={`Delete ${location.name}? This can't be undone.`}
                label="Delete location"
              />
            </Card>
          )}
        </>
      ) : (
        <Card>
          <p className="text-sm text-muted-foreground">{location.address ?? "No address saved."}</p>
          {location.phone && <p className="mt-1 text-sm">{location.phone}</p>}
        </Card>
      )}
    </div>
  );
}
