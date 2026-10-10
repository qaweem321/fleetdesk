import type { Metadata } from "next";
import { PhotoUpload } from "@/components/photo-upload";
import { ActionForm, ActionMessage } from "@/components/ui/action-form";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { documentPhotos, getDriverProfile } from "@/lib/drivers/profile";
import { requireUser } from "@/lib/session";
import { requireSettings } from "@/lib/settings";
import { uploadMyDocument } from "../uploads";
import { saveDriverDetails } from "./actions";
import { DriverStatusNote } from "./driver-status-note";
import { IdentityCheck } from "./identity-check";

export const metadata: Metadata = { title: "Driver details" };

export default async function DriverDetailsPage() {
  const user = await requireUser();
  const [settings, profile] = await Promise.all([requireSettings(), getDriverProfile(user.id)]);
  const photos = documentPhotos(profile);
  const photoList = (field: keyof typeof photos) => (photos[field] ? [photos[field]] : []);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-bold">Driver details</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Send your driver&apos;s license before your first pickup, so handing over the keys only
          takes a minute. Only {settings.businessName} staff can see your documents.
        </p>
      </div>

      <DriverStatusNote profile={profile} />
      {profile?.status !== "approved" && <IdentityCheck settings={settings} />}

      <ActionForm action={saveDriverDetails} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Date of birth"
            htmlFor="dateOfBirth"
            hint={`Drivers must be at least ${settings.minDriverAge}.`}
          >
            <Input
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              required
              defaultValue={profile?.dateOfBirth ?? ""}
            />
          </Field>
          <Field label="License number" htmlFor="licenseNumber">
            <Input
              id="licenseNumber"
              name="licenseNumber"
              required
              maxLength={40}
              defaultValue={profile?.licenseNumber ?? ""}
              className="uppercase"
            />
          </Field>
          <Field label="Issued by (country)" htmlFor="licenseCountry">
            <Input
              id="licenseCountry"
              name="licenseCountry"
              required
              maxLength={60}
              defaultValue={profile?.licenseCountry ?? ""}
              autoComplete="country-name"
            />
          </Field>
          <Field label="Expires on" htmlFor="licenseExpiresOn">
            <Input
              id="licenseExpiresOn"
              name="licenseExpiresOn"
              type="date"
              required
              defaultValue={profile?.licenseExpiresOn ?? ""}
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="License, front" htmlFor="licenseFrontFileId">
            <PhotoUpload
              name="licenseFrontFileId"
              upload={uploadMyDocument}
              initial={photoList("licenseFrontFileId")}
              max={1}
              camera
              label="Add photo"
            />
          </Field>
          <Field label="License, back" htmlFor="licenseBackFileId">
            <PhotoUpload
              name="licenseBackFileId"
              upload={uploadMyDocument}
              initial={photoList("licenseBackFileId")}
              max={1}
              camera
              label="Add photo"
            />
          </Field>
          <Field label="ID or passport" htmlFor="idDocumentFileId" hint="Optional.">
            <PhotoUpload
              name="idDocumentFileId"
              upload={uploadMyDocument}
              initial={photoList("idDocumentFileId")}
              max={1}
              camera
              label="Add photo"
            />
          </Field>
        </div>
        {profile?.status === "approved" && (
          <p className="text-sm text-muted-foreground">
            Changing your details sends them to be checked again.
          </p>
        )}
        <ActionMessage />
        <SubmitButton pendingText="Sending...">Send for checking</SubmitButton>
      </ActionForm>
    </div>
  );
}
