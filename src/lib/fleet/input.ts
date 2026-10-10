import { optionalText, parseWholeNumber, type Read } from "@/lib/form-input";
import { parseMoney } from "@/lib/money";
import { fromLocalInput } from "@/lib/time-zone";
import { isUuid } from "@/lib/uuid";
import {
  type CarClass,
  carClassLabels,
  type FuelType,
  fuelTypeLabels,
  isOneOf,
  type Transmission,
  transmissionLabels,
  type VehicleStatus,
  vehicleStatusLabels,
} from "./labels";

// Checks for the fleet forms (pure functions, shared by the actions and the tests). Each
// returns the cleaned-up values, or one message saying what to fix.
type Result<T> = { values: T } | { error: string };

const NAME_MAX = 80;
const TEXT_MAX = 300;
const DESCRIPTION_MAX = 2000;

// An optional price field: empty means 0 (or null with `emptyAs: null`).
function optionalMoney(text: string, currency: string, emptyAs: 0 | null = 0) {
  return text ? parseMoney(text, currency) : emptyAs;
}

export type LocationInput = {
  name: string;
  address: string | null;
  phone: string | null;
  dropOffFee: number;
};

export function parseLocationInput(read: Read, currency: string): Result<LocationInput> {
  const name = read("name");
  const address = read("address");
  const phone = read("phone");
  const dropOffFee = optionalMoney(read("dropOffFee"), currency);
  if (!name) {
    return { error: "Please enter a name for the location." };
  }
  if (name.length > NAME_MAX) {
    return { error: `The name can be at most ${NAME_MAX} characters.` };
  }
  if (address.length > TEXT_MAX) {
    return { error: `The address can be at most ${TEXT_MAX} characters.` };
  }
  if (phone.length > 40) {
    return { error: "The phone number is too long." };
  }
  if (dropOffFee === null) {
    return { error: "Please enter the drop-off fee as an amount like 25.00, or leave it empty." };
  }
  return {
    values: { name, address: optionalText(address), phone: optionalText(phone), dropOffFee },
  };
}

export type CarModelInput = {
  make: string;
  model: string;
  carClass: CarClass;
  transmission: Transmission;
  fuelType: FuelType;
  seats: number;
  doors: number;
  bags: number;
  description: string | null;
  dailyRate: number;
  weeklyRate: number | null;
  depositAmount: number;
  includedDistancePerDay: number | null;
  extraDistanceFee: number;
};

export function parseCarModelInput(read: Read, currency: string): Result<CarModelInput> {
  const make = read("make");
  const model = read("model");
  const carClass = read("carClass");
  const transmission = read("transmission");
  const fuelType = read("fuelType");
  const seats = parseWholeNumber(read("seats"), 1, 60);
  const doors = parseWholeNumber(read("doors"), 0, 10);
  const bags = parseWholeNumber(read("bags"), 0, 20);
  const description = read("description");
  const dailyRate = parseMoney(read("dailyRate"), currency);
  const weeklyRate = optionalMoney(read("weeklyRate"), currency, null);
  const depositAmount = optionalMoney(read("depositAmount"), currency);
  const distanceText = read("includedDistancePerDay");
  const includedDistancePerDay = distanceText ? parseWholeNumber(distanceText, 1, 100_000) : null;
  const extraDistanceFee = optionalMoney(read("extraDistanceFee"), currency);

  if (!make || !model) {
    return { error: "Please enter the make and the model, like Toyota and Corolla." };
  }
  if (make.length > NAME_MAX || model.length > NAME_MAX) {
    return { error: `The make and model can be at most ${NAME_MAX} characters each.` };
  }
  if (!isOneOf(carClassLabels, carClass)) {
    return { error: "Please choose a car class." };
  }
  if (!isOneOf(transmissionLabels, transmission)) {
    return { error: "Please choose automatic or manual." };
  }
  if (!isOneOf(fuelTypeLabels, fuelType)) {
    return { error: "Please choose a fuel type." };
  }
  if (seats === null || doors === null || bags === null) {
    return { error: "Please enter seats (1-60), doors (0-10) and bags (0-20) as whole numbers." };
  }
  if (description.length > DESCRIPTION_MAX) {
    return { error: `The description can be at most ${DESCRIPTION_MAX} characters.` };
  }
  if (!dailyRate) {
    return { error: "Please enter the price per day, like 49.00." };
  }
  if (read("weeklyRate") && !weeklyRate) {
    return { error: "Please enter the weekly price as an amount, or leave it empty." };
  }
  if (depositAmount === null || extraDistanceFee === null) {
    return { error: "Please enter the deposit and the extra distance fee as amounts like 200.00." };
  }
  if (distanceText && includedDistancePerDay === null) {
    return {
      error:
        "Please enter the included distance per day as a whole number, or leave it empty for unlimited.",
    };
  }
  return {
    values: {
      dailyRate,
      weeklyRate,
      depositAmount,
      includedDistancePerDay,
      extraDistanceFee,
      make,
      model,
      carClass,
      transmission,
      fuelType,
      seats,
      doors,
      bags,
      description: optionalText(description),
    },
  };
}

// "ab-123 cd" -> "AB-123 CD": uppercase, single spaces. The database also treats "AB123CD"
// as the same plate (see the unique index on vehicles).
export function normalizePlate(plate: string) {
  return plate.trim().toUpperCase().replace(/\s+/g, " ");
}

export type VehicleInput = {
  carModelId: string;
  locationId: string;
  plate: string;
  vin: string | null;
  year: number | null;
  color: string | null;
  mileage: number;
  status: VehicleStatus;
  notes: string | null;
};

export function parseVehicleInput(read: Read, currentYear: number): Result<VehicleInput> {
  const carModelId = read("carModelId");
  const locationId = read("locationId");
  const plate = normalizePlate(read("plate"));
  const vin = read("vin").toUpperCase();
  const yearText = read("year");
  const year = yearText ? parseWholeNumber(yearText, 1950, currentYear + 1) : null;
  const color = read("color");
  const mileage = parseWholeNumber(read("mileage") || "0", 0, 9_999_999);
  const status = read("status") || "available";
  const notes = read("notes");

  if (!isUuid(carModelId)) {
    return { error: "Please choose the car model." };
  }
  if (!isUuid(locationId)) {
    return { error: "Please choose where the car is." };
  }
  if (!plate) {
    return { error: "Please enter the number plate." };
  }
  if (plate.length > 20) {
    return { error: "The number plate can be at most 20 characters." };
  }
  if (vin.length > 30) {
    return { error: "The VIN can be at most 30 characters." };
  }
  if (yearText && year === null) {
    return { error: `Please enter a year between 1950 and ${currentYear + 1}, or leave it empty.` };
  }
  if (color.length > 40) {
    return { error: "The color can be at most 40 characters." };
  }
  if (mileage === null) {
    return { error: "Please enter the mileage as a whole number." };
  }
  if (!isOneOf(vehicleStatusLabels, status)) {
    return { error: "Please choose a status." };
  }
  if (notes.length > DESCRIPTION_MAX) {
    return { error: `Notes can be at most ${DESCRIPTION_MAX} characters.` };
  }
  return {
    values: {
      carModelId,
      locationId,
      plate,
      vin: optionalText(vin),
      year,
      color: optionalText(color),
      mileage,
      status,
      notes: optionalText(notes),
    },
  };
}

export type BlockInput = { startsAt: Date; endsAt: Date; reason: string };

// A time a vehicle can't be rented, typed as wall-clock times at the business.
export function parseBlockInput(read: Read, timeZone: string): Result<BlockInput> {
  const startsAt = fromLocalInput(read("startsAt"), timeZone);
  const endsAt = fromLocalInput(read("endsAt"), timeZone);
  const reason = read("reason");
  if (!startsAt || !endsAt) {
    return { error: "Please enter when the block starts and ends." };
  }
  if (endsAt <= startsAt) {
    return { error: "The end must be after the start." };
  }
  if (!reason) {
    return { error: 'Please enter a reason, like "Annual service".' };
  }
  if (reason.length > 200) {
    return { error: "The reason can be at most 200 characters." };
  }
  return { values: { startsAt, endsAt, reason } };
}
