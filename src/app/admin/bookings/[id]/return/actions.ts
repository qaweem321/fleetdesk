"use server";

import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { db } from "@/db";
import { atomic } from "@/db/atomic";
import {
  bookingCharges,
  bookings,
  files,
  inspectionPhotos,
  inspections,
  locations,
  payments,
  vehicles,
} from "@/db/schema";
import type { ActionState } from "@/lib/action-state";
import { getBooking } from "@/lib/bookings/queries";
import { formReader } from "@/lib/form-input";
import { parseMoney } from "@/lib/money";
import { sendRentalCompletedEmail } from "@/lib/notifications/booking-emails";
import { parseChargeLines, parseInspectionInput } from "@/lib/operations/input";
import { getInspections } from "@/lib/operations/queries";
import { settleCardDeposit } from "@/lib/payments/deposits";
import { bookingLedger } from "@/lib/payments/records";
import { requireStaff } from "@/lib/session";
import { requireSettings } from "@/lib/settings";
import { isUuid } from "@/lib/uuid";

// The deposit taken at pickup, if it's still held (card or counter).
async function heldDeposit(bookingId: string) {
  const [hold] = await db
    .select({ method: payments.method, amount: payments.amount })
    .from(payments)
    .where(and(eq(payments.bookingId, bookingId), eq(payments.kind, "deposit_hold")))
    .orderBy(desc(payments.createdAt))
    .limit(1);
  return hold ?? null;
}

// Takes the car back: records its state, adds the extra charges, completes the booking, moves
// the car to the return location and settles the deposit.
export async function completeReturn(
  bookingId: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const [staff, settings, booking] = await Promise.all([
    requireStaff(),
    requireSettings(),
    getBooking(bookingId),
  ]);
  if (!booking) {
    throw new Error("Booking not found.");
  }
  if (booking.status !== "active") {
    return { error: "Only bookings that are picked up can be returned." };
  }
  const read = formReader(formData);
  const { pickup } = await getInspections(booking.id);
  const inspection = parseInspectionInput(read, pickup?.mileage ?? 0);
  if ("error" in inspection) {
    return inspection;
  }
  const charges = parseChargeLines(read("charges"));
  if ("error" in charges) {
    return charges;
  }
  const returnLocationId = read("returnLocationId");
  const [place] = isUuid(returnLocationId)
    ? await db
        .select({ id: locations.id })
        .from(locations)
        .where(eq(locations.id, returnLocationId))
    : [];
  if (!place) {
    return { error: "Please choose where the car was returned." };
  }

  // What to keep from the deposit: never more than was held, nor more than is owed.
  const [ledger, deposit] = await Promise.all([
    bookingLedger(booking.id, booking.total),
    heldDeposit(booking.id),
  ]);
  const keepText = read("depositKeep");
  const keep =
    deposit && ledger.depositHeld > 0 ? parseMoney(keepText || "0", booking.currency) : 0;
  if (keep === null || (deposit && keep > ledger.depositHeld)) {
    return { error: "The amount kept from the deposit can't be more than the deposit." };
  }

  const ids = [...new Set(formData.getAll("photos").map(String))].filter(isUuid).slice(0, 30);
  const ownPhotos =
    ids.length > 0 && booking.customerId
      ? await db
          .select({ id: files.id })
          .from(files)
          .where(
            and(
              inArray(files.id, ids),
              eq(files.visibility, "private"),
              eq(files.ownerId, booking.customerId),
            ),
          )
      : [];
  const photoIds = ids.filter((id) => ownPhotos.some((photo) => photo.id === id));

  const inspectionId = randomUUID();
  const now = new Date();
  await atomic((tx) => [
    tx.insert(inspections).values({
      id: inspectionId,
      bookingId: booking.id,
      kind: "return",
      ...inspection.values,
      createdById: staff.id,
    }),
    ...photoIds.map((fileId, position) =>
      tx.insert(inspectionPhotos).values({ inspectionId, fileId, position }),
    ),
    ...charges.values.map((line) =>
      tx.insert(bookingCharges).values({ bookingId: booking.id, ...line, createdById: staff.id }),
    ),
    tx
      .update(bookings)
      .set({ status: "completed", returnedAt: now, returnLocationId: place.id, updatedAt: now })
      .where(eq(bookings.id, booking.id)),
    tx
      .update(vehicles)
      .set({
        mileage: inspection.values.mileage,
        locationId: place.id,
        status: read("needsMaintenance") === "on" ? "maintenance" : "available",
      })
      .where(eq(vehicles.id, booking.vehicleId)),
  ]);

  if (deposit && ledger.depositHeld > 0) {
    if (deposit.method === "stripe") {
      await settleCardDeposit(booking.id, keep, staff.id);
    } else {
      await db.insert(payments).values({
        bookingId: booking.id,
        kind: keep > 0 ? "deposit_capture" : "deposit_release",
        method: deposit.method,
        amount: keep > 0 ? keep : ledger.depositHeld,
        description: keep > 0 ? "Kept from the deposit" : "Deposit given back",
        createdById: staff.id,
      });
    }
  }

  after(async () => {
    const completed = await getBooking(booking.id);
    if (completed) {
      await sendRentalCompletedEmail(completed, settings).catch(console.error);
    }
  });
  redirect(`/admin/bookings/${booking.id}?returned=1`);
}
