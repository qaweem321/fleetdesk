// Must come first: the database connection reads DATABASE_URL when it is imported.
import "./load-env";
import { notInArray } from "drizzle-orm";
import { demoLogins, isDemoMode } from "../lib/demo";
import { db } from "./index";
import { users } from "./schema";
import { seedBookings } from "./seed/bookings";
import { seedBusiness } from "./seed/business";
import { seedFleet } from "./seed/fleet";
import { seedPeople } from "./seed/people";
import { seedPricing } from "./seed/pricing";
import { resetDemo } from "./seed/reset";

// `npm run db:seed` fills an empty install with a sample rental business: settings, staff and
// customer logins (see src/lib/demo.ts), locations, a fleet and prices. Safe to run again:
// existing rows are kept.
// The sample logins have a published password, so never add them to a real installation:
// only to a fresh database (no other accounts yet) or a public demo (DEMO_MODE="true").
async function refuseRealInstall() {
  if (isDemoMode()) {
    return;
  }
  const demoEmails = Object.values(demoLogins).map((login) => login.email);
  const others = await db.$count(users, notInArray(users.email, demoEmails));
  if (others > 0) {
    throw new Error(
      'This database already has real accounts. The sample data adds logins with a published password, so it only runs on a fresh database or with DEMO_MODE="true".',
    );
  }
}

async function seed() {
  await refuseRealInstall();
  // `npm run db:reset-demo`: start the live demo over (only works with DEMO_MODE="true").
  if (process.argv.includes("--reset")) {
    await resetDemo();
  }
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
