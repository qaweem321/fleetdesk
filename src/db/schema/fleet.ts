// The fleet: where cars are (locations), what customers book (car models) and the actual cars
// with number plates (vehicles).
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { files } from "./files";

// A branch: an airport desk, a downtown office...
export const locations = pgTable("locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  // Inactive locations can't be picked on the website, but their history stays.
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const carClassEnum = pgEnum("car_class", [
  "economy",
  "compact",
  "midsize",
  "fullsize",
  "suv",
  "van",
  "luxury",
  "convertible",
  "pickup",
]);
export const transmissionEnum = pgEnum("transmission", ["automatic", "manual"]);
export const fuelTypeEnum = pgEnum("fuel_type", ["petrol", "diesel", "hybrid", "electric"]);

// What customers see and book: "Toyota Corolla, automatic, 5 seats". Each model has one or
// more vehicles; a booking gets a free one assigned.
export const carModels = pgTable("car_models", {
  id: uuid("id").primaryKey().defaultRandom(),
  make: text("make").notNull(),
  model: text("model").notNull(),
  carClass: carClassEnum("car_class").notNull(),
  transmission: transmissionEnum("transmission").notNull(),
  fuelType: fuelTypeEnum("fuel_type").notNull(),
  seats: integer("seats").notNull(),
  doors: integer("doors").notNull(),
  bags: integer("bags").notNull(),
  description: text("description"),
  // Hidden models stay in the admin area but aren't offered on the website.
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// A model's photos, in order. The first one is the main photo.
export const carModelPhotos = pgTable(
  "car_model_photos",
  {
    carModelId: uuid("car_model_id")
      .notNull()
      .references(() => carModels.id, { onDelete: "cascade" }),
    fileId: uuid("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
  },
  (table) => [primaryKey({ columns: [table.carModelId, table.fileId] })],
);

export const vehicleStatusEnum = pgEnum("vehicle_status", [
  // Can be rented.
  "available",
  // In the workshop: not offered until it's set back to available.
  "maintenance",
  // Sold or written off: kept for history, never offered again.
  "retired",
]);

// One real car with a number plate.
export const vehicles = pgTable(
  "vehicles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // A model or location in use can't be deleted (hide or deactivate it instead).
    carModelId: uuid("car_model_id")
      .notNull()
      .references(() => carModels.id, { onDelete: "restrict" }),
    // Where the car is now. A one-way rental moves it to the return location.
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "restrict" }),
    plate: text("plate").notNull(),
    vin: text("vin"),
    year: integer("year"),
    color: text("color"),
    // The odometer reading, in the business's distance unit (Settings).
    mileage: integer("mileage").notNull().default(0),
    status: vehicleStatusEnum("status").notNull().default("available"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Plates are compared without spaces or dashes ("AB-123" and "AB 123" are the same car).
    // They're saved in uppercase, as typed otherwise, so they look right on screen.
    uniqueIndex("vehicles_plate_unique").on(sql`regexp_replace(${table.plate}, '[\\s-]', '', 'g')`),
    index("vehicles_car_model_id_idx").on(table.carModelId),
    index("vehicles_location_id_idx").on(table.locationId),
  ],
);

// A time a vehicle can't be rented: a planned service, a private use, bodywork...
export const vehicleBlocks = pgTable(
  "vehicle_blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    reason: text("reason").notNull(),
    createdById: text("created_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("vehicle_blocks_vehicle_id_idx").on(table.vehicleId),
    check("vehicle_blocks_ends_after_start", sql`${table.endsAt} > ${table.startsAt}`),
  ],
);
