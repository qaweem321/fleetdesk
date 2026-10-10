import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/admin/page-header";
import { ActionForm, ActionMessage } from "@/components/ui/action-form";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { carModelName } from "@/lib/fleet/labels";
import { carModelOptions, locationOptions } from "@/lib/fleet/queries";
import { formatDate } from "@/lib/format";
import { taxRateText } from "@/lib/pricing/input";
import { listExtras, listSeasons } from "@/lib/pricing/queries";
import { percentLabel } from "@/lib/pricing/quote";
import { requireStaff } from "@/lib/session";
import { requireSettings } from "@/lib/settings";
import { addSeason, deleteSeason, updateRules } from "./actions";
import { QuoteCalculator } from "./quote-calculator";

export const metadata: Metadata = { title: "Pricing" };

// "2026-06-01" (a calendar date) shown as "Jun 1, 2026".
const showDate = (key: string) => formatDate(new Date(`${key}T12:00:00Z`));

export default async function PricingPage() {
  const [, settings, seasonList, models, locations, extras] = await Promise.all([
    requireStaff("pricing:manage"),
    requireSettings(),
    listSeasons(),
    carModelOptions(),
    locationOptions(),
    listExtras({ activeOnly: true }),
  ]);

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title="Pricing"
        description="Each car model has its own daily and weekly price (under Cars). Here: seasons, tax and booking rules."
      />

      <Card title="Price calculator">
        <QuoteCalculator
          models={models.map((model) => ({ id: model.id, name: carModelName(model) }))}
          locations={locations.filter((location) => location.active)}
          extras={extras}
          currency={settings.currency}
          taxName={settings.taxName}
          taxRate={settings.taxRate}
        />
      </Card>

      <Card title="Seasons">
        <p className="mb-4 text-sm text-muted-foreground">
          Raise or lower every price on certain dates, like +20% in summer or −15% in the low
          season. Weekly prices change too.
        </p>
        {seasonList.length > 0 && (
          <ul className="mb-5 divide-y divide-border rounded-lg border border-border">
            {seasonList.map((season) => (
              <li
                key={season.id}
                className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {season.name}{" "}
                    <span className="text-muted-foreground">
                      {percentLabel(season.adjustmentPercent)}
                    </span>
                  </p>
                  <p className="text-muted-foreground">
                    {showDate(season.startsOn)} – {showDate(season.endsOn)}
                  </p>
                </div>
                <form action={deleteSeason}>
                  <input type="hidden" name="id" value={season.id} />
                  <SubmitButton
                    variant="danger-link"
                    size="inline"
                    pendingText="Deleting..."
                    confirm={`Delete the season "${season.name}"? Existing bookings keep their price.`}
                  >
                    Delete
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
        <ActionForm action={addSeason} resetOnSuccess className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Name" htmlFor="season-name">
              <Input id="season-name" name="name" required maxLength={60} placeholder="Summer" />
            </Field>
            <Field label="First day" htmlFor="season-start">
              <Input id="season-start" name="startsOn" type="date" required />
            </Field>
            <Field label="Last day" htmlFor="season-end">
              <Input id="season-end" name="endsOn" type="date" required />
            </Field>
            <Field label="Change (%)" htmlFor="season-adjustment" hint="20 or −15">
              <Input
                id="season-adjustment"
                name="adjustmentPercent"
                required
                inputMode="numeric"
                placeholder="20"
              />
            </Field>
          </div>
          <ActionMessage />
          <SubmitButton variant="outline" pendingText="Adding...">
            Add season
          </SubmitButton>
        </ActionForm>
      </Card>

      <Card title="Tax and booking rules">
        <ActionForm action={updateRules} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Tax rate (%)"
              htmlFor="taxRate"
              hint="Added on top of every price. 0 for none."
            >
              <Input
                id="taxRate"
                name="taxRate"
                inputMode="decimal"
                defaultValue={taxRateText(settings.taxRate)}
              />
            </Field>
            <Field label="Tax name" htmlFor="taxName" hint={`Like "VAT" or "Sales tax".`}>
              <Input id="taxName" name="taxName" maxLength={30} defaultValue={settings.taxName} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="Grace period (minutes)"
              htmlFor="graceMinutes"
              hint="A return this late isn't charged an extra day."
            >
              <Input
                id="graceMinutes"
                name="graceMinutes"
                type="number"
                min={0}
                max={240}
                defaultValue={settings.graceMinutes}
              />
            </Field>
            <Field
              label="Booking notice (hours)"
              htmlFor="minLeadHours"
              hint="How soon an online booking can start."
            >
              <Input
                id="minLeadHours"
                name="minLeadHours"
                type="number"
                min={0}
                max={720}
                defaultValue={settings.minLeadHours}
              />
            </Field>
            <Field
              label="Longest rental (days)"
              htmlFor="maxRentalDays"
              hint="For online bookings."
            >
              <Input
                id="maxRentalDays"
                name="maxRentalDays"
                type="number"
                min={1}
                max={365}
                defaultValue={settings.maxRentalDays}
              />
            </Field>
          </div>
          <ActionMessage />
          <SubmitButton pendingText="Saving...">Save rules</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
