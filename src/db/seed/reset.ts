import { notInArray } from "drizzle-orm";
import { demoLogins } from "../../lib/demo";
import { deleteFiles } from "../../lib/storage";
import { db } from "../index";
import {
  bookings,
  businessSettings,
  carModels,
  coupons,
  driverProfiles,
  extras,
  files,
  invitations,
  locations,
  maintenanceTasks,
  seasons,
  users,
  vehicles,
} from "../schema";

// Puts the live demo back to its starting point: deletes the whole business (settings, fleet,
// prices, bookings, uploads) and every account except the sample logins, so `seed` can fill it
// again. Refuses to run outside demo mode, so a real business can never be wiped by mistake.
export async function resetDemo() {
  if (process.env.DEMO_MODE !== "true") {
    throw new Error('The reset only runs with DEMO_MODE="true". It deletes all data.');
  }
  // Order matters: bookings use vehicles, vehicles use models and locations.
  await db.delete(bookings);
  await db.delete(maintenanceTasks);
  await db.delete(vehicles);
  await db.delete(carModels);
  await db.delete(locations);
  await Promise.all([
    db.delete(extras),
    db.delete(seasons),
    db.delete(coupons),
    db.delete(invitations),
  ]);
  await db.delete(driverProfiles);
  await db.delete(businessSettings);
  const demoEmails = Object.values(demoLogins).map((login) => login.email);
  await db.delete(users).where(notInArray(users.email, demoEmails));
  // Nothing uses any upload anymore.
  const all = await db.select({ id: files.id }).from(files);
  await deleteFiles(all.map((file) => file.id));
  console.log("Demo data deleted.");
}
