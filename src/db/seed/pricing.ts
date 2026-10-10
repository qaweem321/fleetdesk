import { eq } from "drizzle-orm";
import { db } from "../index";
import { carModels, coupons, extras, seasons } from "../schema";

// Sample prices in cents, by car model name.
const rates: Record<
  string,
  { daily: number; weekly: number; deposit: number; distance: number | null }
> = {
  "Kia Picanto": { daily: 3200, weekly: 19000, deposit: 20000, distance: null },
  "Toyota Corolla": { daily: 4500, weekly: 27000, deposit: 25000, distance: null },
  "Tesla Model 3": { daily: 8900, weekly: 54000, deposit: 50000, distance: 300 },
  "Toyota RAV4": { daily: 6900, weekly: 41000, deposit: 40000, distance: null },
  "Ford Transit": { daily: 9900, weekly: 59000, deposit: 50000, distance: 250 },
  "BMW 5 Series": { daily: 14900, weekly: 89000, deposit: 100000, distance: 200 },
};

// Prices, extras, a season and a coupon for the sample fleet. Only fills in what's missing, so
// prices someone has set are never changed.
export async function seedPricing() {
  const models = await db.select().from(carModels).where(eq(carModels.dailyRate, 0));
  await Promise.all(
    models
      .filter((model) => rates[`${model.make} ${model.model}`])
      .map((model) => {
        const rate = rates[`${model.make} ${model.model}`];
        return db
          .update(carModels)
          .set({
            dailyRate: rate.daily,
            weeklyRate: rate.weekly,
            depositAmount: rate.deposit,
            includedDistancePerDay: rate.distance,
            extraDistanceFee: rate.distance ? 35 : 0,
          })
          .where(eq(carModels.id, model.id));
      }),
  );

  if ((await db.$count(extras)) === 0) {
    await db.insert(extras).values([
      {
        name: "Child seat",
        description: "For children from 9 to 18 kg.",
        price: 800,
        charge: "per_day",
        maxQuantity: 3,
      },
      { name: "GPS navigation", price: 600, charge: "per_day" },
      {
        name: "Additional driver",
        description: "Must show a valid license at pickup.",
        price: 1200,
        charge: "per_day",
      },
      {
        name: "Full insurance",
        description: "No excess to pay for damage.",
        price: 1900,
        charge: "per_day",
      },
      {
        name: "Prepaid fuel",
        description: "Return the car at any fuel level.",
        price: 6500,
        charge: "per_rental",
      },
    ]);
  }
  if ((await db.$count(seasons)) === 0) {
    const year = new Date().getUTCFullYear() + 1;
    await db.insert(seasons).values([
      {
        name: "Winter holidays",
        startsOn: `${year - 1}-12-20`,
        endsOn: `${year}-01-04`,
        adjustmentPercent: 25,
      },
      { name: "Summer", startsOn: `${year}-06-15`, endsOn: `${year}-08-31`, adjustmentPercent: 15 },
    ]);
  }
  if ((await db.$count(coupons)) === 0) {
    await db.insert(coupons).values({ code: "WELCOME10", type: "percent", amount: 10 });
  }
}
