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
    // Added on top of every price. In hundredths of a percent: 825 = 8.25%.
    taxRate: integer("tax_rate").notNull().default(0),
    taxName: text("tax_name").notNull().default("Tax"),
    // A return up to this many minutes late isn't charged as an extra day.
    graceMinutes: integer("grace_minutes").notNull().default(59),
    // Online bookings must start at least this many hours from now...
    minLeadHours: integer("min_lead_hours").notNull().default(2),
    // ...and last at most this many days.
    maxRentalDays: integer("max_rental_days").notNull().default(30),
    // Cleaning time after each return before the car can be rented again.
    turnaroundMinutes: integer("turnaround_minutes").notNull().default(60),
    // Customers can cancel online until this many hours before pickup.
    freeCancellationHours: integer("free_cancellation_hours").notNull().default(24),
    // "#2563eb": buttons and highlights on the public site and in the admin area.
    brandColor: text("brand_color"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check("business_settings_single_row", sql`${table.id} = 1`)],
);
