import { getTableColumns } from "drizzle-orm";
import { revalidateTag, unstable_cache } from "next/cache";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { db } from "@/db";
import { businessSettings } from "@/db/schema";

const SETTINGS_TAG = "business-settings";

// Every column except updatedAt (a Date doesn't survive the cache as a Date).
const { updatedAt: _updatedAt, ...columns } = getTableColumns(businessSettings);

// Almost every page needs the business name, currency and time zone. They rarely change, so
// they're read once and cached until someone saves the Settings page.
const loadSettings = unstable_cache(
  async () => {
    const [row] = await db.select(columns).from(businessSettings);
    return row ?? null;
  },
  [SETTINGS_TAG],
  { tags: [SETTINGS_TAG] },
);

export type BusinessSettings = NonNullable<Awaited<ReturnType<typeof loadSettings>>>;

// Null until the setup wizard has run. connection() marks the page as rendered per request,
// so nothing tries to read the database while the app is being built (e.g. in Docker).
export async function getSettings() {
  await connection();
  return loadSettings();
}

// For pages that only make sense once the business exists: before setup, go to /setup.
export async function requireSettings() {
  const settings = await getSettings();
  if (!settings) {
    redirect("/setup");
  }
  return settings;
}

// Call after changing business_settings, so the next page shows the new values.
export function settingsChanged() {
  revalidateTag(SETTINGS_TAG, { expire: 0 });
}
