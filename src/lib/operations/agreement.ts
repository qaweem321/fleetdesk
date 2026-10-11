import { formatDateTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { fuelLabel } from "./charges";

// The rental agreement signed at pickup (pure, so the text is predictable and testable). The
// exact text is saved with the signature, so later changes to the terms never change what a
// customer signed.

export const DEFAULT_AGREEMENT_TERMS = `1. The renter must hold a valid driver's license for the whole rental and drive the vehicle carefully and lawfully.
2. Only the renter and drivers added to this booking may drive the vehicle.
3. The vehicle must be returned on time, to the agreed location, with the same fuel or charge level as at pickup. Late returns, missing fuel and extra distance may be charged.
4. The renter is responsible for fines, tolls and parking charges during the rental.
5. Damage that is not on the pickup inspection may be charged, up to the deposit unless insurance was added.
6. Smoking and pets are not allowed in the vehicle unless agreed in writing. Extra cleaning may be charged.
7. The deposit is taken at pickup (held on the renter's card or paid at the counter) and given back after the return, minus any charges for damage, fuel, distance or late return.`;

type AgreementFacts = {
  businessName: string;
  businessAddress: string | null;
  reference: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  car: string;
  plate: string;
  pickupAt: Date;
  returnAt: Date;
  pickupLocation: string;
  returnLocation: string;
  mileage: number;
  fuelLevel: number;
  distanceUnit: string;
  total: number;
  depositAmount: number;
  currency: string;
  timeZone: string;
  terms: string | null;
};

export function buildAgreementText(facts: AgreementFacts) {
  const when = (date: Date) => formatDateTime(date, facts.timeZone);
  const money = (amount: number) => formatMoney(amount, facts.currency);
  const lines = [
    `RENTAL AGREEMENT ${facts.reference}`,
    `${facts.businessName}${facts.businessAddress ? `, ${facts.businessAddress}` : ""}`,
    "",
    `Renter: ${facts.customerName} (${facts.customerEmail}, ${facts.customerPhone})`,
    `Vehicle: ${facts.car}, plate ${facts.plate}`,
    `Pickup: ${when(facts.pickupAt)}, ${facts.pickupLocation}`,
    `Return: ${when(facts.returnAt)}, ${facts.returnLocation}`,
    `At pickup: ${facts.mileage.toLocaleString("en-US")} ${facts.distanceUnit}, fuel ${fuelLabel(facts.fuelLevel)}`,
    `Rental price: ${money(facts.total)}`,
    facts.depositAmount > 0 ? `Deposit: ${money(facts.depositAmount)}` : null,
    "",
    "TERMS",
    (facts.terms?.trim() || DEFAULT_AGREEMENT_TERMS).trim(),
  ];
  return lines.filter((line) => line !== null).join("\n");
}
