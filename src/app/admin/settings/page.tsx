import type { Metadata } from "next";
import { BusinessFields } from "@/components/business-fields";
import { PhotoUpload } from "@/components/photo-upload";
import { ActionForm, ActionMessage } from "@/components/ui/action-form";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireStaff } from "@/lib/session";
import { requireSettings } from "@/lib/settings";
import { fileUrl } from "@/lib/storage";
import { uploadPublicPhoto } from "../uploads";
import { updateSettings } from "./actions";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [, settings] = await Promise.all([requireStaff("settings:update"), requireSettings()]);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="mt-1 text-muted-foreground">
        Your business details, shown on the website, in emails and on rental agreements.
      </p>

      <div className="mt-8">
        <ActionForm action={updateSettings} className="space-y-5">
          <BusinessFields values={settings} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone" htmlFor="contactPhone">
              <Input
                id="contactPhone"
                name="contactPhone"
                type="tel"
                maxLength={40}
                defaultValue={settings.contactPhone ?? ""}
                placeholder="+1 555 0100"
              />
            </Field>
            <Field
              label="Brand color"
              htmlFor="brandColor"
              hint="Buttons and highlights. Empty: blue."
            >
              <Input
                id="brandColor"
                name="brandColor"
                maxLength={7}
                defaultValue={settings.brandColor ?? ""}
                placeholder="#2563eb"
              />
            </Field>
          </div>
          <Field
            label="Address"
            htmlFor="address"
            hint="Your main office. Branches are added under Locations."
          >
            <Textarea
              id="address"
              name="address"
              maxLength={300}
              defaultValue={settings.address ?? ""}
              className="min-h-16"
            />
          </Field>
          <Field
            label="Logo"
            htmlFor="logo"
            hint="Shown instead of the business name. A PNG with a transparent background looks best."
          >
            <PhotoUpload
              name="logo"
              upload={uploadPublicPhoto}
              initial={
                settings.logoFileId
                  ? [{ id: settings.logoFileId, url: fileUrl(settings.logoFileId) }]
                  : []
              }
              max={1}
              maxDimension={512}
              keepPng
              label="Upload logo"
            />
          </Field>
          <ActionMessage />
          <SubmitButton pendingText="Saving...">Save settings</SubmitButton>
        </ActionForm>
      </div>
    </div>
  );
}
