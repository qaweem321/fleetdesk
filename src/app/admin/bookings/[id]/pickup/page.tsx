import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card, PageHeader } from "@/components/admin/page-header";
import { PhotoUpload } from "@/components/photo-upload";
import { SignaturePad } from "@/components/signature-pad";
import { ActionForm, ActionMessage } from "@/components/ui/action-form";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { db } from "@/db";
import { vehicles } from "@/db/schema";
import { bookingWindow, freeVehicles } from "@/lib/bookings/availability";
import { getBooking } from "@/lib/bookings/queries";
import { getDriverProfile } from "@/lib/drivers/profile";
import { driverReadinessProblems } from "@/lib/drivers/rules";
import { formatMoney } from "@/lib/money";
import { buildAgreementText } from "@/lib/operations/agreement";
import { fuelLabel } from "@/lib/operations/charges";
import { manualMethodLabels } from "@/lib/payments/input";
import { bookingLedger } from "@/lib/payments/records";
import { requireStaff } from "@/lib/session";
import { requireSettings } from "@/lib/settings";
import { localDateKey } from "@/lib/time-zone";
import { isUuid } from "@/lib/uuid";
import { uploadInspectionPhoto } from "../../../uploads";
import { completePickup } from "./actions";

export const metadata: Metadata = { title: "Pickup" };

const FUEL_LEVELS = [8, 7, 6, 5, 4, 3, 2, 1, 0];

export default async function PickupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }
  const [, settings, booking] = await Promise.all([
    requireStaff(),
    requireSettings(),
    getBooking(id),
  ]);
  if (!booking) {
    notFound();
  }
  if (booking.status !== "confirmed") {
    redirect(`/admin/bookings/${booking.id}`);
  }
  const window = bookingWindow(booking.pickupAt, booking.returnAt, settings.turnaroundMinutes);
  const [[assigned], others, profile, ledger] = await Promise.all([
    db.select().from(vehicles).where(eq(vehicles.id, booking.vehicleId)),
    freeVehicles(booking.carModelId, booking.pickupLocationId, window, 20),
    booking.customerId ? getDriverProfile(booking.customerId) : null,
    bookingLedger(booking.id, booking.total),
  ]);
  const choices = [assigned, ...others.filter((vehicle) => vehicle.id !== assigned.id)];
  const problems = driverReadinessProblems(profile, {
    pickupDate: localDateKey(booking.pickupAt, settings.timeZone),
    returnDate: localDateKey(booking.returnAt, settings.timeZone),
    minAge: settings.minDriverAge,
  });
  const money = (amount: number) => formatMoney(amount, booking.currency);
  const preview = buildAgreementText({
    businessName: settings.businessName,
    businessAddress: settings.address,
    reference: booking.reference,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    customerPhone: booking.customerPhone,
    car: `${booking.make} ${booking.model}`,
    plate: assigned.plate,
    pickupAt: booking.pickupAt,
    returnAt: booking.returnAt,
    pickupLocation: booking.pickupLocationName,
    returnLocation: booking.returnLocationName,
    mileage: assigned.mileage,
    fuelLevel: 8,
    distanceUnit: settings.distanceUnit,
    total: booking.total,
    depositAmount: booking.depositAmount,
    currency: booking.currency,
    timeZone: settings.timeZone,
    terms: settings.agreementTerms,
  });

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title={`Pickup ${booking.reference}`}
        back={{ label: "Booking", href: `/admin/bookings/${booking.id}` }}
        description={`${booking.customerName} · ${booking.make} ${booking.model}`}
      />

      <ActionForm action={completePickup.bind(null, booking.id)} className="space-y-6">
        <Card title="1. Driver">
          {problems.length === 0 ? (
            <p className="text-sm text-success">
              The driver&apos;s license is checked and valid for this rental.
            </p>
          ) : (
            <div className="space-y-3">
              <ul className="list-disc space-y-1 pl-5 text-sm text-warning">
                {problems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  name="licenseChecked"
                  className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
                />
                <span>
                  I&apos;ve checked the driver&apos;s license in person: it&apos;s valid, the photo
                  matches and the driver is old enough. (Details:{" "}
                  {booking.customerId ? (
                    <Link
                      href={`/admin/customers/${booking.customerId}`}
                      className="text-link underline"
                      target="_blank"
                    >
                      customer page
                    </Link>
                  ) : (
                    "no account"
                  )}
                  )
                </span>
              </label>
            </div>
          )}
        </Card>

        <Card title="2. Car and inspection">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="Car"
              htmlFor="vehicleId"
              hint="Another free car of the same model can be given."
            >
              <Select id="vehicleId" name="vehicleId" defaultValue={assigned.id} className="w-full">
                {choices.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.plate}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={`Mileage (${settings.distanceUnit})`} htmlFor="mileage">
              <Input
                id="mileage"
                name="mileage"
                type="number"
                min={0}
                required
                defaultValue={assigned.mileage}
              />
            </Field>
            <Field label="Fuel" htmlFor="fuelLevel">
              <Select id="fuelLevel" name="fuelLevel" defaultValue="8" className="w-full">
                {FUEL_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {fuelLabel(level)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="mt-4 space-y-4">
            <Field
              label="Photos"
              htmlFor="photos"
              hint="All four sides, the dashboard and any existing damage."
            >
              <PhotoUpload
                name="photos"
                upload={uploadInspectionPhoto.bind(null, booking.id)}
                max={20}
                camera
                label="Take photos"
              />
            </Field>
            <Field label="Damage and notes" htmlFor="notes">
              <Textarea
                id="notes"
                name="notes"
                maxLength={1000}
                placeholder="Small scratch on the front left door"
              />
            </Field>
          </div>
        </Card>

        <Card title="3. Payment and deposit">
          <p className="text-sm">
            {ledger.due > 0 ? (
              <span className="text-warning">
                Still to pay: {money(ledger.due)}. Take the payment and record it on the booking
                page.
              </span>
            ) : (
              <span className="text-success">The rental is paid.</span>
            )}
          </p>
          {booking.depositAmount > 0 && (
            <Field label={`Deposit of ${money(booking.depositAmount)}`} htmlFor="depositMethod">
              <Select
                id="depositMethod"
                name="depositMethod"
                defaultValue={booking.stripePaymentMethodId ? "card" : "card_terminal"}
                className="w-full sm:w-96"
              >
                {booking.stripePaymentMethodId && (
                  <option value="card">Hold on the card used online</option>
                )}
                {Object.entries(manualMethodLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    Taken at the counter: {label}
                  </option>
                ))}
                <option value="none">No deposit for this rental</option>
              </Select>
            </Field>
          )}
        </Card>

        <Card title="4. Rental agreement">
          <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg bg-muted p-4 font-sans text-sm">
            {preview}
          </pre>
          <p className="mt-2 text-xs text-subtle-foreground">
            The car, mileage and fuel above are filled in when the customer signs.
          </p>
          <div className="mt-4 space-y-4">
            <Field label="Name of the person signing" htmlFor="signerName">
              <Input
                id="signerName"
                name="signerName"
                required
                maxLength={100}
                defaultValue={booking.customerName}
              />
            </Field>
            <Field label="Signature" htmlFor="signature">
              <SignaturePad name="signature" />
            </Field>
          </div>
        </Card>

        <ActionMessage />
        <SubmitButton size="lg" pendingText="Saving...">
          Hand over the keys
        </SubmitButton>
      </ActionForm>
    </div>
  );
}
