// Must come first: the database connection reads DATABASE_URL when it is imported.
import "./load-env";
import { notInArray } from "drizzle-orm";
import { db } from "./index";
import { users } from "./schema";
import { seedBookings } from "./seed/bookings";
import { seedBusiness } from "./seed/business";
import { seedFleet } from "./seed/fleet";
import { sampleLogins } from "./seed/logins";
import { seedPeople } from "./seed/people";
import { seedPricing } from "./seed/pricing";

// `npm run db:seed` fills an empty install with a sample rental business: settings, staff and
// customer logins (see src/db/seed/logins.ts), locations, a fleet and prices. Safe to run again:
// existing rows are kept.
// The sample logins have a published password, so never add them to a real installation:
// only to a fresh database (no other accounts yet).
async function refuseRealInstall() {
  const sampleEmails = Object.values(sampleLogins).map((login) => login.email);
  const others = await db.$count(users, notInArray(users.email, sampleEmails));
  if (others > 0) {
    throw new Error(
      "This database already has real accounts. The sample data adds logins with a published password, so it only runs on a fresh database.",
    );
  }
}

async function seed() {
  await refuseRealInstall();
  await seedBusiness();
  await seedPeople();
  await seedFleet();
  await seedPricing();
  await seedBookings();
  console.log("Sample data is ready.");
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
