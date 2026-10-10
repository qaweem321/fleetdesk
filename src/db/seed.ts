// Must come first: the database connection reads DATABASE_URL when it is imported.
import "./load-env";
import { seedBookings } from "./seed/bookings";
import { seedBusiness } from "./seed/business";
import { seedFleet } from "./seed/fleet";
import { seedPeople } from "./seed/people";
import { seedPricing } from "./seed/pricing";
import { resetDemo } from "./seed/reset";

// `npm run db:seed` fills an empty install with a sample rental business: settings, staff and
// customer logins (see src/lib/demo.ts), locations, a fleet and prices. Safe to run again:
// existing rows are kept.
async function seed() {
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
