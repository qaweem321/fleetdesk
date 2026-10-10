// What happens at the counter: inspections when the car goes out and comes back, the signed
// rental agreement, and extra charges after the return.
import {
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { bookings } from "./bookings";
import { files } from "./files";

export const inspectionKindEnum = pgEnum("inspection_kind", ["pickup", "return"]);

// The state of the car at pickup and at return, so damage and fuel can be compared.
export const inspections = pgTable(
  "inspections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    kind: inspectionKindEnum("kind").notNull(),
    // Odometer, in the business's distance unit.
    mileage: integer("mileage").notNull(),
    // Fuel or battery level in eighths: 8 = full, 0 = empty.
    fuelLevel: integer("fuel_level").notNull(),
    notes: text("notes"),
    createdById: text("created_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("inspections_once").on(table.bookingId, table.kind)],
);

// Photos taken during an inspection, with the time they were taken (createdAt of the file).
export const inspectionPhotos = pgTable(
  "inspection_photos",
  {
    inspectionId: uuid("inspection_id")
      .notNull()
      .references(() => inspections.id, { onDelete: "cascade" }),
    fileId: uuid("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
  },
  (table) => [primaryKey({ columns: [table.inspectionId, table.fileId] })],
);

// The rental agreement the customer signed at pickup: the exact text they saw, their typed name
// and their drawn signature.
export const agreements = pgTable("agreements", {
  bookingId: uuid("booking_id")
    .primaryKey()
    .references(() => bookings.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  signerName: text("signer_name").notNull(),
  signatureFileId: uuid("signature_file_id").references(() => files.id, { onDelete: "set null" }),
  signedAt: timestamp("signed_at", { withTimezone: true }).notNull().defaultNow(),
  // The device's address when signing, kept as evidence.
  signedFromIp: text("signed_from_ip"),
  staffId: text("staff_id").references(() => users.id, { onDelete: "set null" }),
});

export const chargeKindEnum = pgEnum("charge_kind", [
  "extra_distance",
  "fuel",
  "late_return",
  "damage",
  "cleaning",
  "other",
]);

// Money the customer owes on top of the booking total, added at the return. (What was actually
// paid is in `payments`.)
export const bookingCharges = pgTable(
  "booking_charges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    kind: chargeKindEnum("kind").notNull(),
    description: text("description").notNull(),
    amount: integer("amount").notNull(),
    createdById: text("created_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("booking_charges_booking_id_idx").on(table.bookingId)],
);
