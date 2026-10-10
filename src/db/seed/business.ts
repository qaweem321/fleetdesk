import { db } from "../index";
import { businessSettings } from "../schema";

// The sample business. Kept as is when settings already exist (a real install).
export async function seedBusiness() {
  await db
    .insert(businessSettings)
    .values({
      id: 1,
      businessName: "Sunrise Car Rental",
      currency: "USD",
      timeZone: "America/New_York",
      contactEmail: "hello@sunrise-rental.test",
      contactPhone: "+1 555 0100",
      address: "120 Ocean Drive, Miami, FL",
    })
    .onConflictDoNothing();
}
