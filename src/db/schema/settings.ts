// The rental business's settings. There is exactly one row (id 1), created by the setup wizard.
import { sql } from "drizzle-orm";
import { check, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { files } from "./files";

export const distanceUnitEnum = pgEnum("distance_unit", ["km", "mi"]);

export const businessSettings = pgTable(
  "business_settings",
  {
    id: integer("id").primaryKey().default(1),
    businessName: text("business_name").notNull(),
    // ISO 4217 code ("USD", "EUR"). Every price in the app is in this currency, in cents.
    currency: text("currency").notNull().default("USD"),
    // IANA name ("Europe/Berlin"). Every date and time is shown in this zone.
    timeZone: text("time_zone").notNull().default("UTC"),
    // Odometer readings and mileage limits use this unit.
    distanceUnit: distanceUnitEnum("distance_unit").notNull().default("km"),
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),
    address: text("address"),
    logoFileId: uuid("logo_file_id").references(() => files.id, { onDelete: "set null" }),
    // "#2563eb": buttons and highlights on the public site and in the admin area.
    brandColor: text("brand_color"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check("business_settings_single_row", sql`${table.id} = 1`)],
);
