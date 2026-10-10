// Must come first: the database connection reads DATABASE_URL when it is imported.
import "./load-env";
import { seedBusiness } from "./seed/business";
import { seedPeople } from "./seed/people";

// `npm run db:seed` fills an empty install with a sample rental business: settings, staff and
// customer logins (see src/lib/demo.ts). Safe to run again: existing rows are kept.
async function seed() {
  await seedBusiness();
  await seedPeople();
  console.log("Sample data is ready.");
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
