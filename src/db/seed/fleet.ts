import { db } from "../index";
import { carModels, locations, vehicles } from "../schema";

type ModelSeed = typeof carModels.$inferInsert & {
  // Number plates per location: [airport, downtown].
  plates: [string[], string[]];
};

const models: ModelSeed[] = [
  {
    make: "Kia",
    model: "Picanto",
    carClass: "economy",
    transmission: "manual",
    fuelType: "petrol",
    seats: 4,
    doors: 5,
    bags: 1,
    description: "Small, thrifty and easy to park. Perfect for getting around the city.",
    plates: [["FLA 1001"], ["FLA 1002"]],
  },
  {
    make: "Toyota",
    model: "Corolla",
    carClass: "compact",
    transmission: "automatic",
    fuelType: "hybrid",
    seats: 5,
    doors: 4,
    bags: 2,
    description: "Comfortable, quiet and very low on fuel. Our most popular car.",
    plates: [["FLA 2001", "FLA 2002"], ["FLA 2003"]],
  },
  {
    make: "Tesla",
    model: "Model 3",
    carClass: "midsize",
    transmission: "automatic",
    fuelType: "electric",
    seats: 5,
    doors: 4,
    bags: 2,
    description: "Fully electric with over 300 miles of range. Supercharging is billed at cost.",
    plates: [["FLA 3001"], ["FLA 3002"]],
  },
  {
    make: "Toyota",
    model: "RAV4",
    carClass: "suv",
    transmission: "automatic",
    fuelType: "hybrid",
    seats: 5,
    doors: 5,
    bags: 4,
    description: "Room for the family and the luggage, with all-wheel drive.",
    plates: [["FLA 4001", "FLA 4002"], ["FLA 4003"]],
  },
  {
    make: "Ford",
    model: "Transit",
    carClass: "van",
    transmission: "manual",
    fuelType: "diesel",
    seats: 9,
    doors: 4,
    bags: 6,
    description: "Nine seats for groups, teams and airport runs.",
    plates: [["FLA 5001"], []],
  },
  {
    make: "BMW",
    model: "5 Series",
    carClass: "luxury",
    transmission: "automatic",
    fuelType: "petrol",
    seats: 5,
    doors: 4,
    bags: 3,
    description: "Business-class comfort with leather seats and every extra.",
    plates: [[], ["FLA 6001"]],
  },
];

// Two branches and a small fleet. Only added to an empty install, so a real fleet is never
// touched.
export async function seedFleet() {
  if ((await db.$count(locations)) > 0) {
    return;
  }
  const [airport, downtown] = await db
    .insert(locations)
    .values([
      {
        name: "Miami Airport (MIA)",
        address: "Rental Car Center, 3900 NW 25th St, Miami, FL",
        phone: "+1 555 0101",
      },
      { name: "Downtown Miami", address: "120 Ocean Drive, Miami, FL", phone: "+1 555 0100" },
    ])
    .returning({ id: locations.id });

  const savedModels = await db
    .insert(carModels)
    .values(models.map(({ plates: _plates, ...model }) => model))
    .returning({ id: carModels.id });

  const fleet = models.flatMap((model, index) =>
    model.plates.flatMap((plates, side) =>
      plates.map((plate, number) => ({
        carModelId: savedModels[index].id,
        locationId: side === 0 ? airport.id : downtown.id,
        plate,
        year: 2024 + (number % 2),
        mileage: 8000 + index * 3100 + number * 1700,
      })),
    ),
  );
  await db.insert(vehicles).values(fleet);
}
