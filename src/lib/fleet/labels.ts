// Names shown for the fixed fleet choices. Also the lists the forms offer and the server
// accepts, so a value can never be shown without a label.

export const carClassLabels = {
  economy: "Economy",
  compact: "Compact",
  midsize: "Midsize",
  fullsize: "Full-size",
  suv: "SUV",
  van: "Van",
  luxury: "Luxury",
  convertible: "Convertible",
  pickup: "Pickup truck",
} as const;
export type CarClass = keyof typeof carClassLabels;

export const transmissionLabels = { automatic: "Automatic", manual: "Manual" } as const;
export type Transmission = keyof typeof transmissionLabels;

export const fuelTypeLabels = {
  petrol: "Petrol",
  diesel: "Diesel",
  hybrid: "Hybrid",
  electric: "Electric",
} as const;
export type FuelType = keyof typeof fuelTypeLabels;

export const vehicleStatusLabels = {
  available: "Available",
  maintenance: "In maintenance",
  retired: "Retired",
} as const;
export type VehicleStatus = keyof typeof vehicleStatusLabels;

export function isOneOf<T extends string>(labels: Record<T, string>, value: string): value is T {
  return Object.hasOwn(labels, value);
}

// "Toyota Corolla"
export function carModelName(model: { make: string; model: string }) {
  return `${model.make} ${model.model}`;
}
