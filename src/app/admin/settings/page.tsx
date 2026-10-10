import type { Metadata } from "next";
import { BusinessFields } from "@/components/business-fields";
import { PhotoUpload } from "@/components/photo-upload";
import { ActionForm, ActionMessage } from "@/components/ui/action-form";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { stripeConfigured } from "@/lib/payments/options";
import { requireStaff } from "@/lib/session";
import { requireSettings } from "@/lib/settings";
import { fileUrl } from "@/lib/storage";
import { uploadPublicPhoto } from "../uploads";
import { updatePaymentOptions, updateSettings } from "./actions";

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

      <section className="mt-12 border-t border-border pt-8">
        <h2 className="text-lg font-semibold">Payments</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          How customers pay for a booking. Online payment uses Stripe and saves the card, so the
          deposit and any charges after the return can go on it without asking again.
        </p>
        {stripeConfigured() ? (
          <ActionForm action={updatePaymentOptions} className="mt-4 space-y-3">
            <Field label="Customers can" htmlFor="paymentOptions">
              <Select
                id="paymentOptions"
                name="paymentOptions"
                defaultValue={settings.paymentOptions}
                className="w-full sm:w-80"
              >
                <option value="pay_at_pickup">Only pay at pickup</option>
                <option value="online">Only pay online when booking</option>
                <option value="both">Choose: online or at pickup</option>
              </Select>
            </Field>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                name="stripeIdentityEnabled"
                defaultChecked={settings.stripeIdentityEnabled}
                className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
              />
              <span>
                <span className="block font-medium">
                  Offer automatic ID checks (Stripe Identity)
                </span>
                <span className="block text-muted-foreground">
                  Customers verify their license with a selfie; Stripe charges a small fee per
                  check. Turn it on in your Stripe dashboard first.
                </span>
              </span>
            </label>
            <ActionMessage />
            <SubmitButton pendingText="Saving...">Save payment options</SubmitButton>
          </ActionForm>
        ) : (
          <p className="mt-4 rounded-lg bg-muted p-4 text-sm">
            Customers pay at pickup. To accept online payments, add your Stripe keys
            (STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET) as explained in the README.
          </p>
        )}
      </section>
    </div>
  );
}
