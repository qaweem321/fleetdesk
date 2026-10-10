// Service reminders per vehicle: oil change, tires, inspection... Each task is due on a date,
// at a mileage, or both (whichever comes first), and can repeat.
import { date, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { vehicles } from "./fleet";

export const maintenanceTasks = pgTable(
  "maintenance_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    // A calendar date at the business ("2026-12-01"), a mileage, or both.
    dueOn: date("due_on"),
    dueMileage: integer("due_mileage"),
    // When done, the next one is planned this many months or km/miles later (empty: once).
    repeatMonths: integer("repeat_months"),
    repeatDistance: integer("repeat_distance"),
    notes: text("notes"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedMileage: integer("completed_mileage"),
    completedById: text("completed_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("maintenance_tasks_vehicle_id_idx").on(table.vehicleId)],
);
