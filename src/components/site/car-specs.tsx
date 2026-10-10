import {
  type CarClass,
  carClassLabels,
  type FuelType,
  fuelTypeLabels,
  type Transmission,
  transmissionLabels,
} from "@/lib/fleet/labels";

type Specs = {
  carClass: CarClass;
  transmission: Transmission;
  fuelType: FuelType;
  seats: number;
  doors: number;
  bags: number;
};

// "Compact · Automatic · Hybrid · 5 seats · 4 doors · 2 bags" as small chips.
export function CarSpecs({ model }: { model: Specs }) {
  const specs = [
    carClassLabels[model.carClass],
    transmissionLabels[model.transmission],
    fuelTypeLabels[model.fuelType],
    `${model.seats} seats`,
    `${model.doors} doors`,
    `${model.bags} ${model.bags === 1 ? "bag" : "bags"}`,
  ];
  return (
    <ul className="flex flex-wrap gap-1.5">
      {specs.map((spec) => (
        <li
          key={spec}
          className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-secondary-foreground"
        >
          {spec}
        </li>
      ))}
    </ul>
  );
}
