"use client";

import { useMemo, useState } from "react";
import { PhotoUpload } from "@/components/photo-upload";
import { ActionForm, ActionMessage } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/action-state";
import { formatMoney, moneyInputValue, parseMoney } from "@/lib/money";
import { type ChargeLine, fuelLabel, suggestReturnCharges } from "@/lib/operations/charges";
import type { SaveResult } from "@/lib/storage";

type Props = {
  action: (previous: ActionState, formData: FormData) => Promise<ActionState>;
  upload: (formData: FormData) => Promise<SaveResult>;
  // Everything the suggested charges depend on (see suggestReturnCharges).
  booking: {
    pickupAt: string;
    returnAt: string;
    days: number;
    rentalPrice: number;
    currency: string;
    returnLocationId: string;
  };
  model: { includedDistancePerDay: number | null; extraDistanceFee: number };
  pickup: { mileage: number; fuelLevel: number };
  settings: { graceMinutes: number; fuelChargePerEighth: number; distanceUnit: "km" | "mi" };
  locations: { id: string; name: string }[];
  // Money so far: still owed before extra charges, and the deposit held.
  due: number;
  depositHeld: number;
  // Held on the customer's card (released by Stripe) or taken at the counter (given back by hand).
  depositOnCard: boolean;
};

const FUEL_LEVELS = [8, 7, 6, 5, 4, 3, 2, 1, 0];

export function ReturnForm({
  action,
  upload,
  booking,
  model,
  pickup,
  settings,
  locations,
  due,
  depositHeld,
  depositOnCard,
}: Props) {
  const [mileage, setMileage] = useState(String(pickup.mileage));
  const [fuelLevel, setFuelLevel] = useState(String(pickup.fuelLevel));
  const [skipped, setSkipped] = useState<string[]>([]);
  const [extra, setExtra] = useState<ChargeLine[]>([]);
  const [damageText, setDamageText] = useState("");
  const [damageAmount, setDamageAmount] = useState("");
  const money = (amount: number) => formatMoney(amount, booking.currency);

  // Suggestions follow what staff type, with the return time being now.
  const suggested = useMemo(
    () =>
      suggestReturnCharges({
        booking: {
          ...booking,
          pickupAt: new Date(booking.pickupAt),
          returnAt: new Date(booking.returnAt),
        },
        model,
        pickup,
        back: {
          mileage: Number(mileage) || pickup.mileage,
          fuelLevel: Number(fuelLevel),
          at: new Date(),
        },
        settings,
      }),
    [booking, model, pickup, settings, mileage, fuelLevel],
  );
  const charges = [...suggested.filter((line) => !skipped.includes(line.kind)), ...extra];
  const chargesTotal = charges.reduce((sum, line) => sum + line.amount, 0);
  const owed = due + chargesTotal;
  const keepDefault = Math.min(owed, depositHeld);

  function addDamage() {
    const amount = parseMoney(damageAmount, booking.currency);
    if (!damageText.trim() || !amount) {
      return;
    }
    setExtra((lines) => [...lines, { kind: "damage", description: damageText.trim(), amount }]);
    setDamageText("");
    setDamageAmount("");
  }

  return (
    <ActionForm action={action} className="space-y-6">
      <input type="hidden" name="charges" value={JSON.stringify(charges)} />

      <section className="rounded-xl border border-border p-5 space-y-4">
        <h2 className="text-lg font-semibold">1. The car</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label={`Mileage (${settings.distanceUnit})`}
            htmlFor="mileage"
            hint={`At pickup: ${pickup.mileage.toLocaleString("en-US")}`}
          >
            <Input
              id="mileage"
              name="mileage"
              type="number"
              min={pickup.mileage}
              required
              value={mileage}
              onChange={(event) => setMileage(event.target.value)}
            />
          </Field>
          <Field
            label="Fuel"
            htmlFor="fuelLevel"
            hint={`At pickup: ${fuelLabel(pickup.fuelLevel)}`}
          >
            <Select
              id="fuelLevel"
              name="fuelLevel"
              value={fuelLevel}
              onChange={(event) => setFuelLevel(event.target.value)}
              className="w-full"
            >
              {FUEL_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {fuelLabel(level)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Returned at" htmlFor="returnLocationId">
            <Select
              id="returnLocationId"
              name="returnLocationId"
              defaultValue={booking.returnLocationId}
              className="w-full"
            >
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Photos" htmlFor="photos" hint="Same angles as at pickup, and any new damage.">
          <PhotoUpload name="photos" upload={upload} max={20} camera label="Take photos" />
        </Field>
        <Field label="Notes" htmlFor="notes">
          <Textarea id="notes" name="notes" maxLength={1000} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="needsMaintenance"
            className="h-4 w-4 accent-[var(--primary)]"
          />
          The car needs maintenance before it&apos;s rented again
        </label>
      </section>

      <section className="rounded-xl border border-border p-5 space-y-4">
        <h2 className="text-lg font-semibold">2. Extra charges</h2>
        {suggested.length === 0 && extra.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nothing extra so far: on time, fuel and distance are fine.
          </p>
        )}
        <ul className="space-y-2">
          {suggested.map((line) => (
            <li key={line.kind} className="flex items-start justify-between gap-3 text-sm">
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={!skipped.includes(line.kind)}
                  onChange={(event) =>
                    setSkipped((kinds) =>
                      event.target.checked
                        ? kinds.filter((kind) => kind !== line.kind)
                        : [...kinds, line.kind],
                    )
                  }
                  className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
                />
                {line.description}
              </label>
              <span className="tabular-nums">{money(line.amount)}</span>
            </li>
          ))}
          {extra.map((line, index) => (
            <li
              key={`${line.description}-${line.amount}`}
              className="flex items-start justify-between gap-3 text-sm"
            >
              <span>{line.description}</span>
              <span className="flex items-center gap-3 tabular-nums">
                {money(line.amount)}
                <Button
                  type="button"
                  variant="danger-link"
                  size="inline"
                  onClick={() => setExtra((lines) => lines.filter((_, i) => i !== index))}
                >
                  Remove
                </Button>
              </span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Damage or other charge" htmlFor="damage-text">
            <Input
              id="damage-text"
              value={damageText}
              onChange={(event) => setDamageText(event.target.value)}
              placeholder="Scratch on the rear bumper"
              className="min-w-64"
            />
          </Field>
          <Field label="Amount" htmlFor="damage-amount">
            <Input
              id="damage-amount"
              value={damageAmount}
              inputMode="decimal"
              onChange={(event) => setDamageAmount(event.target.value)}
              className="w-28"
            />
          </Field>
          <Button type="button" variant="outline" onClick={addDamage}>
            Add charge
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-border p-5 space-y-3">
        <h2 className="text-lg font-semibold">3. Settle</h2>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt>Still owed for the booking</dt>
            <dd className="tabular-nums">{money(due)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Extra charges</dt>
            <dd className="tabular-nums">{money(chargesTotal)}</dd>
          </div>
          <div className="flex justify-between border-t border-border pt-1 font-semibold">
            <dt>Owed now</dt>
            <dd className="tabular-nums">{money(owed)}</dd>
          </div>
        </dl>
        {depositHeld > 0 ? (
          <Field
            label={`Keep from the ${money(depositHeld)} deposit`}
            htmlFor="depositKeep"
            hint={
              depositOnCard
                ? "Filled in with what's owed. The rest is released on the customer's card; anything the deposit doesn't cover is paid now."
                : "Filled in with what's owed. Give the rest back to the customer; anything the deposit doesn't cover is paid now."
            }
          >
            <Input
              key={keepDefault}
              id="depositKeep"
              name="depositKeep"
              inputMode="decimal"
              defaultValue={moneyInputValue(keepDefault, booking.currency)}
              className="w-40"
            />
          </Field>
        ) : (
          owed > 0 && (
            <p className="text-sm text-warning">
              Take the payment and record it on the booking page.
            </p>
          )
        )}
      </section>

      <ActionMessage />
      <SubmitButton size="lg" pendingText="Saving..." confirm="Complete the return?">
        Complete the return
      </SubmitButton>
    </ActionForm>
  );
}
