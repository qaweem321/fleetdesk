import { formatMoney } from "@/lib/money";
import { rentalDays } from "@/lib/pricing/rental-days";

// The extra charges suggested when a car comes back (pure, so it's easy to test). Staff see each
// line with its reason and can change or remove it before completing the return.

export type ChargeKind =
  | "extra_distance"
  | "fuel"
  | "late_return"
  | "damage"
  | "cleaning"
  | "other";
export type ChargeLine = { kind: ChargeKind; description: string; amount: number };

type Return = {
  booking: {
    pickupAt: Date;
    returnAt: Date;
    days: number;
    rentalPrice: number;
    currency: string;
  };
  model: { includedDistancePerDay: number | null; extraDistanceFee: number };
  pickup: { mileage: number; fuelLevel: number };
  back: { mileage: number; fuelLevel: number; at: Date };
  settings: { graceMinutes: number; fuelChargePerEighth: number; distanceUnit: "km" | "mi" };
};

export function suggestReturnCharges({
  booking,
  model,
  pickup,
  back,
  settings,
}: Return): ChargeLine[] {
  const lines: ChargeLine[] = [];
  const money = (amount: number) => formatMoney(amount, booking.currency);
  const unit = settings.distanceUnit;

  // More distance than the rental included.
  if (model.includedDistancePerDay !== null && model.extraDistanceFee > 0) {
    const driven = Math.max(0, back.mileage - pickup.mileage);
    const included = model.includedDistancePerDay * booking.days;
    const extra = driven - included;
    if (extra > 0) {
      lines.push({
        kind: "extra_distance",
        description: `${extra} ${unit} over the ${included} ${unit} included (${money(model.extraDistanceFee)} per ${unit})`,
        amount: extra * model.extraDistanceFee,
      });
    }
  }

  // Less fuel (or charge) than at pickup.
  const missingEighths = pickup.fuelLevel - back.fuelLevel;
  if (missingEighths > 0 && settings.fuelChargePerEighth > 0) {
    lines.push({
      kind: "fuel",
      description: `Fuel: ${missingEighths}/8 of a tank less than at pickup`,
      amount: missingEighths * settings.fuelChargePerEighth,
    });
  }

  // Back later than booked (beyond the grace period): the extra days at the booking's average
  // day price.
  const chargedDays = rentalDays(booking.pickupAt, back.at, settings.graceMinutes);
  const lateDays = chargedDays - booking.days;
  if (back.at > booking.returnAt && lateDays > 0) {
    const dayPrice = Math.round(booking.rentalPrice / booking.days);
    lines.push({
      kind: "late_return",
      description: `Returned late: ${lateDays} extra ${lateDays === 1 ? "day" : "days"} at ${money(dayPrice)}`,
      amount: lateDays * dayPrice,
    });
  }
  return lines;
}

// "Full", "3/4", "1/8": a fuel level for people.
export function fuelLabel(eighths: number) {
  if (eighths === 8) {
    return "Full";
  }
  if (eighths === 0) {
    return "Empty";
  }
  const divisor = eighths % 4 === 0 ? 4 : eighths % 2 === 0 ? 2 : 1;
  return `${eighths / divisor}/${8 / divisor}`;
}
