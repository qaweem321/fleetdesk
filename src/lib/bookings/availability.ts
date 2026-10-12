import { and, asc, eq, getTableColumns, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { qualified } from "@/db/qualified";
import { bookings, carModels, vehicleBlocks, vehicles } from "@/db/schema";
import { HOLDING_STATUSES } from "./status";

// Which cars are free. A vehicle is free for a time window when it's based at the pickup
// location, its status is "available", and no holding booking or blocked period overlaps the
// window. The window runs from pickup until the car is ready again (return + cleaning time).

const MINUTE = 60_000;

export type Window = { start: Date; readyAt: Date };

// The window a booking holds: pickup until return + cleaning time.
export function bookingWindow(start: Date, end: Date, turnaroundMinutes: number): Window {
  return { start, readyAt: new Date(end.getTime() + turnaroundMinutes * MINUTE) };
}

// SQL: the vehicle in the outer query is free during the window. A booking whose online payment
// didn't come in time doesn't count (it's cancelled before any new booking is saved), so
// searching never has to write to the database first.
function isFree(window: Window) {
  const range = sql`tstzrange(${window.start.toISOString()}, ${window.readyAt.toISOString()}, '[)')`;
  const statuses = sql.join(
    HOLDING_STATUSES.map((status) => sql`${status}`),
    sql`, `,
  );
  return sql`not exists (
      select 1 from ${bookings} as b
      where b.vehicle_id = ${qualified(vehicles.id)}
        and b.status in (${statuses})
        and not (b.status = 'pending_payment' and b.hold_expires_at < now())
        and tstzrange(b.pickup_at, b.ready_at, '[)') && ${range}
    ) and not exists (
      select 1 from ${vehicleBlocks} as k
      where k.vehicle_id = ${qualified(vehicles.id)}
        and tstzrange(k.starts_at, k.ends_at, '[)') && ${range}
    )`;
}

// Bookable car models with at least one free vehicle at the location, and how many are free.
export async function availableModels(locationId: string, window: Window) {
  return db
    .select({
      ...getTableColumns(carModels),
      freeCount: sql<number>`count(${vehicles.id})`.mapWith(Number),
    })
    .from(carModels)
    .innerJoin(
      vehicles,
      and(
        eq(vehicles.carModelId, carModels.id),
        eq(vehicles.locationId, locationId),
        eq(vehicles.status, "available"),
        isFree(window),
      ),
    )
    .where(and(eq(carModels.active, true), gt(carModels.dailyRate, 0)))
    .groupBy(carModels.id)
    .orderBy(asc(carModels.dailyRate));
}

// The free vehicles of one model, lowest mileage first (so wear is spread across the fleet).
// Several are returned: if another booking takes the first one at the same moment, the next
// one is tried.
export async function freeVehicles(
  carModelId: string,
  locationId: string,
  window: Window,
  limit = 5,
) {
  return db
    .select({ id: vehicles.id, plate: vehicles.plate, mileage: vehicles.mileage })
    .from(vehicles)
    .where(
      and(
        eq(vehicles.carModelId, carModelId),
        eq(vehicles.locationId, locationId),
        eq(vehicles.status, "available"),
        isFree(window),
      ),
    )
    .orderBy(asc(vehicles.mileage))
    .limit(limit);
}
