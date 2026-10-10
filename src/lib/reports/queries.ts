import { and, asc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { bookings, carModels, locations, payments, vehicles } from "@/db/schema";
import type { Period } from "./period";

const place = alias(locations, "place");

// Bookings for the dashboard lists, with the car and the place.
function bookingRows() {
  return db
    .select({
      id: bookings.id,
      reference: bookings.reference,
      customerName: bookings.customerName,
      customerPhone: bookings.customerPhone,
      pickupAt: bookings.pickupAt,
      returnAt: bookings.returnAt,
      status: bookings.status,
      make: carModels.make,
      model: carModels.model,
      plate: vehicles.plate,
      placeName: place.name,
    })
    .from(bookings)
    .innerJoin(carModels, eq(bookings.carModelId, carModels.id))
    .innerJoin(vehicles, eq(bookings.vehicleId, vehicles.id));
}

// Today's work at the counter: who picks up, who brings back, and who is late.
export async function counterToday(day: Period, now = new Date()) {
  const [pickups, returns, late] = await Promise.all([
    bookingRows()
      .innerJoin(place, eq(bookings.pickupLocationId, place.id))
      .where(
        and(
          inArray(bookings.status, ["confirmed", "pending_payment"]),
          gte(bookings.pickupAt, day.from),
          lt(bookings.pickupAt, day.to),
        ),
      )
      .orderBy(asc(bookings.pickupAt)),
    bookingRows()
      .innerJoin(place, eq(bookings.returnLocationId, place.id))
      .where(
        and(
          eq(bookings.status, "active"),
          gte(bookings.returnAt, now),
          lt(bookings.returnAt, day.to),
        ),
      )
      .orderBy(asc(bookings.returnAt)),
    bookingRows()
      .innerJoin(place, eq(bookings.returnLocationId, place.id))
      .where(and(eq(bookings.status, "active"), lt(bookings.returnAt, now)))
      .orderBy(asc(bookings.returnAt)),
  ]);
  return { pickups, returns, late };
}

// How many cars are free, out with a customer, in the workshop or retired.
export async function fleetCounts() {
  const [byStatus, [out]] = await Promise.all([
    db
      .select({ status: vehicles.status, count: sql<number>`count(*)`.mapWith(Number) })
      .from(vehicles)
      .groupBy(vehicles.status),
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(bookings)
      .where(eq(bookings.status, "active")),
  ]);
  const count = (status: string) => byStatus.find((row) => row.status === status)?.count ?? 0;
  return {
    total: count("available") + count("maintenance"),
    out: out?.count ?? 0,
    maintenance: count("maintenance"),
  };
}

// Money in for a period: payments and charged deposits, minus refunds, by when they happened.
export async function revenue(period: Period) {
  const [row] = await db
    .select({
      total:
        sql<number>`coalesce(sum(case when ${payments.kind} = 'refund' then -${payments.amount} when ${payments.kind} in ('payment', 'deposit_capture') then ${payments.amount} else 0 end), 0)`.mapWith(
          Number,
        ),
    })
    .from(payments)
    .where(and(gte(payments.createdAt, period.from), lt(payments.createdAt, period.to)));
  return row?.total ?? 0;
}

// Per car model: bookings that started in the period, their value, and how much of the time the
// model's cars were rented (only the part of each rental inside the period counts). Rentals that
// already happened use their real pickup and return times.
export async function modelReport(period: Period) {
  // The real pickup and return times once they happened, else the booked ones.
  const startedAt = sql`coalesce(${bookings.pickedUpAt}, ${bookings.pickupAt})`;
  const endedAt = sql`coalesce(${bookings.returnedAt}, ${bookings.returnAt})`;
  const from = period.from.toISOString();
  const to = period.to.toISOString();
  const rentedMs =
    sql<number>`coalesce(sum(extract(epoch from (least(${endedAt}, ${to}::timestamptz) - greatest(${startedAt}, ${from}::timestamptz)))) filter (where ${bookings.status} in ('confirmed', 'active', 'completed') and ${startedAt} < ${to}::timestamptz and ${endedAt} > ${from}::timestamptz), 0) * 1000`.mapWith(
      Number,
    );
  const [rows, cars] = await Promise.all([
    db
      .select({
        id: carModels.id,
        make: carModels.make,
        model: carModels.model,
        rentedMs,
        bookingCount:
          sql<number>`count(*) filter (where ${bookings.status} in ('confirmed', 'active', 'completed') and ${startedAt} >= ${from}::timestamptz and ${startedAt} < ${to}::timestamptz)`.mapWith(
            Number,
          ),
        bookedValue:
          sql<number>`coalesce(sum(${bookings.total}) filter (where ${bookings.status} in ('confirmed', 'active', 'completed') and ${startedAt} >= ${from}::timestamptz and ${startedAt} < ${to}::timestamptz), 0)`.mapWith(
            Number,
          ),
      })
      .from(carModels)
      .leftJoin(bookings, eq(bookings.carModelId, carModels.id))
      .groupBy(carModels.id)
      .orderBy(asc(carModels.make), asc(carModels.model)),
    db
      .select({ carModelId: vehicles.carModelId, count: sql<number>`count(*)`.mapWith(Number) })
      .from(vehicles)
      .where(sql`${vehicles.status} <> 'retired'`)
      .groupBy(vehicles.carModelId),
  ]);
  return rows.map((row) => ({
    ...row,
    carCount: cars.find((car) => car.carModelId === row.id)?.count ?? 0,
  }));
}
