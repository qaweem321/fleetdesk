import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/admin/page-header";
import { BookingStatusBadge } from "@/components/booking-status-badge";
import { DriverStatusBadge } from "@/components/driver-status-badge";
import { ActionForm, ActionMessage } from "@/components/ui/action-form";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { listCustomerBookings } from "@/lib/bookings/queries";
import { documentPhotos, getDriverProfile } from "@/lib/drivers/profile";
import { getRenter } from "@/lib/drivers/queries";
import { ageOn } from "@/lib/drivers/rules";
import { formatDate, formatDateTime } from "@/lib/format";
import { requireStaff } from "@/lib/session";
import { requireSettings } from "@/lib/settings";
import { localDateKey } from "@/lib/time-zone";
import { isUuid } from "@/lib/uuid";
import { reviewLicense } from "../actions";

export const metadata: Metadata = { title: "Customer" };

const showDate = (key: string) => formatDate(new Date(`${key}T12:00:00Z`));

const documentLabels = {
  licenseFrontFileId: "License, front",
  licenseBackFileId: "License, back",
  idDocumentFileId: "ID or passport",
};

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id) && !/^[A-Za-z0-9_-]{10,64}$/.test(id)) {
    notFound();
  }
  const [, settings, renter, profile, bookings] = await Promise.all([
    requireStaff(),
    requireSettings(),
    getRenter(id),
    getDriverProfile(id),
    listCustomerBookings(id),
  ]);
  if (!renter) {
    notFound();
  }
  const today = localDateKey(new Date(), settings.timeZone);
  const photos = documentPhotos(profile);

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title={renter.name}
        back={{ label: "Customers", href: "/admin/customers" }}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {renter.email}
            {renter.phone && ` · ${renter.phone}`}
            <DriverStatusBadge status={profile?.status ?? null} />
          </span>
        }
      />

      <Card title="Driver's license">
        {profile?.status ? (
          <div className="space-y-5">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Date of birth</dt>
                <dd className="font-medium">
                  {profile.dateOfBirth
                    ? `${showDate(profile.dateOfBirth)} (age ${ageOn(profile.dateOfBirth, today)})`
                    : "Not given"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">License number</dt>
                <dd className="font-mono font-medium">{profile.licenseNumber ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Issued by</dt>
                <dd className="font-medium">{profile.licenseCountry ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Expires</dt>
                <dd
                  className={`font-medium ${profile.licenseExpiresOn && profile.licenseExpiresOn < today ? "text-danger" : ""}`}
                >
                  {profile.licenseExpiresOn ? showDate(profile.licenseExpiresOn) : "—"}
                </dd>
              </div>
            </dl>
            <ul className="grid gap-3 sm:grid-cols-3">
              {Object.entries(documentLabels).map(([field, label]) => {
                const photo = photos[field as keyof typeof photos];
                return (
                  <li key={field} className="text-sm">
                    <p className="mb-1 text-muted-foreground">{label}</p>
                    {photo ? (
                      <a href={photo.url} target="_blank" rel="noreferrer">
                        {/* biome-ignore lint/performance/noImgElement: private uploads served by our own route */}
                        <img
                          src={photo.url}
                          alt={label}
                          className="aspect-[3/2] w-full rounded-md border border-border object-cover"
                        />
                      </a>
                    ) : (
                      <p className="text-subtle-foreground">Not sent</p>
                    )}
                  </li>
                );
              })}
            </ul>
            {profile.verifiedBy === "stripe_identity" && (
              <p className="text-sm text-success">
                Verified automatically by Stripe Identity (license and selfie).
              </p>
            )}
            {profile.reviewedAt && profile.verifiedBy !== "stripe_identity" && (
              <p className="text-sm text-muted-foreground">
                Last checked {formatDateTime(profile.reviewedAt, settings.timeZone)}
                {profile.reviewNote && `: ${profile.reviewNote}`}
              </p>
            )}
            <ActionForm
              action={reviewLicense.bind(null, renter.id)}
              className="space-y-3 border-t border-border pt-4"
            >
              <Field
                label="Note"
                htmlFor="review-note"
                hint="Required when turning it down; the customer sees it."
              >
                <Input
                  id="review-note"
                  name="note"
                  maxLength={300}
                  placeholder="The photo of the back is blurry"
                />
              </Field>
              <ActionMessage />
              <div className="flex flex-wrap gap-2">
                <SubmitButton name="decision" value="approve" pendingText="Saving...">
                  Accept license
                </SubmitButton>
                <SubmitButton
                  name="decision"
                  value="reject"
                  variant="danger-outline"
                  pendingText="Saving..."
                >
                  Ask to fix
                </SubmitButton>
              </div>
            </ActionForm>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            This customer hasn&apos;t sent their license yet. They can do it under Driver details in
            their account, or you can check it at the counter.
          </p>
        )}
      </Card>

      <Card title={`Bookings (${bookings.length})`}>
        {bookings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bookings yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {bookings.map((booking) => (
              <li key={booking.id}>
                <Link
                  href={`/admin/bookings/${booking.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm hover:underline"
                >
                  <span>
                    <span className="font-mono">{booking.reference}</span> · {booking.make}{" "}
                    {booking.model} · {formatDateTime(booking.pickupAt, settings.timeZone)}
                  </span>
                  <BookingStatusBadge status={booking.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
