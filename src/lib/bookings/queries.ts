import { and, asc, desc, eq, getTableColumns, inArray, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { bookingExtras, bookings, carModels, locations, vehicles } from "@/db/schema";
import type { Quote } from "@/lib/pricing/quote";

const pickupLocation = alias(locations, "pickup_location");
const returnLocation = alias(locations, "return_location");

// A booking with the names people need to see: car model, plate and both locations.
function bookingWithNames() {
  return db
    .select({
      ...getTableColumns(bookings),
      make: carModels.make,
      model: carModels.model,
      plate: vehicles.plate,
      pickupLocationName: pickupLocation.name,
      pickupLocationAddress: pickupLocation.address,
      returnLocationName: returnLocation.name,
      returnLocationAddress: returnLocation.address,
    })
    .from(bookings)
    .innerJoin(carModels, eq(bookings.carModelId, carModels.id))
    .innerJoin(vehicles, eq(bookings.vehicleId, vehicles.id))
    .innerJoin(pickupLocation, eq(bookings.pickupLocationId, pickupLocation.id))
    .innerJoin(returnLocation, eq(bookings.returnLocationId, returnLocation.id));
}

export type BookingDetails = NonNullable<Awaited<ReturnType<typeof getBooking>>>;

// One booking with its extras. `customerId` limits it to that customer's own bookings.
export async function getBooking(id: string, customerId?: string) {
  const condition = customerId
    ? and(eq(bookings.id, id), eq(bookings.customerId, customerId))
    : eq(bookings.id, id);
  const [[booking], extras] = await Promise.all([
    bookingWithNames().where(condition),
    db
      .select()
      .from(bookingExtras)
      .where(eq(bookingExtras.bookingId, id))
      .orderBy(asc(bookingExtras.name)),
  ]);
  return booking ? { ...booking, extras } : null;
}

// Several bookings with their names, in one query (without extras).
export async function listBookingsByIds(ids: string[]) {
  return ids.length === 0 ? [] : bookingWithNames().where(inArray(bookings.id, ids));
}

export async function listCustomerBookings(customerId: string) {
  return bookingWithNames()
    .where(eq(bookings.customerId, customerId))
    .orderBy(desc(bookings.pickupAt));
}

export type StaffBookingFilter = "upcoming" | "out" | "past" | "cancelled";

const filterConditions: Record<StaffBookingFilter, SQL> = {
  // Not picked up yet: next pickups first.
  upcoming: inArray(bookings.status, ["pending_payment", "confirmed"]),
  // With the customer now.
  out: eq(bookings.status, "active"),
  past: eq(bookings.status, "completed"),
  cancelled: eq(bookings.status, "cancelled"),
};

export async function listStaffBookings(filter: StaffBookingFilter, page: number, pageSize = 50) {
  const ascending = filter === "upcoming" || filter === "out";
  const rows = await bookingWithNames()
    .where(filterConditions[filter])
    .orderBy(ascending ? asc(bookings.pickupAt) : desc(bookings.pickupAt))
    .limit(pageSize + 1)
    .offset((page - 1) * pageSize);
  return { rows: rows.slice(0, pageSize), hasMore: rows.length > pageSize };
}

// A saved booking's price in the shape the price breakdown shows. It uses the amounts saved
// on the booking, never today's prices.
export function bookingQuote(booking: BookingDetails): Quote {
  return {
    days: booking.days,
    usesWeeklyRate: false,
    rentalPrice: booking.rentalPrice,
    seasonNotes: [],
    extras: booking.extras.map((extra) => ({
      id: extra.id,
      name: extra.name,
      price: extra.price,
      charge: extra.charge,
      quantity: extra.quantity,
      amount: extra.amount,
    })),
    extrasTotal: booking.extrasTotal,
    dropOffFee: booking.dropOffFee,
    discount: booking.discount,
    tax: booking.tax,
    total: booking.total,
  };
}
