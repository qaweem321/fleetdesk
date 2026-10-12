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
import { type ActionState, isUniqueViolation } from "@/lib/action-state";
import { getBooking } from "@/lib/bookings/queries";
import { formReader } from "@/lib/form-input";
import { formatMoney, parseMoney } from "@/lib/money";
import { sendRentalCompletedEmail } from "@/lib/notifications/booking-emails";
import { parseChargeLines, parseInspectionInput } from "@/lib/operations/input";
import { getInspections } from "@/lib/operations/queries";
import { hasCardDeposit, settleCardDeposit } from "@/lib/payments/deposits";
import { depositSettlementRows } from "@/lib/payments/ledger";
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
  // ...nor more than the customer owes: what's still due for the booking plus the new charges.
  const owed = ledger.due + charges.values.reduce((sum, line) => sum + line.amount, 0);
  if (keep > owed) {
    return {
      error: `The customer owes ${formatMoney(owed, booking.currency)}, so you can't keep more than that from the deposit.`,
    };
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
  try {
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
  } catch (error) {
    // Someone else finished this return a moment earlier.
    if (isUniqueViolation(error)) {
      return { error: "This return was already completed. Please reload the page." };
    }
    throw error;
  }

  // The booking is completed now. If Stripe can't be reached for the card deposit, the hold
  // stays open and the booking page offers to settle it again.
  let holdExpired = false;
  let unsettled = false;
  if (deposit && ledger.depositHeld > 0) {
    if (deposit.method === "stripe") {
      try {
        holdExpired = (await settleCardDeposit(booking.id, keep, staff.id))?.holdExpired ?? false;
      } catch (error) {
        console.error("Settling the card deposit failed:", error);
        unsettled = true;
      }
    } else {
      await db.insert(payments).values(
        depositSettlementRows(ledger.depositHeld, keep, "Deposit given back").map((row) => ({
          ...row,
          bookingId: booking.id,
          method: deposit.method,
          createdById: staff.id,
        })),
      );
    }
  }

  after(async () => {
    const completed = await getBooking(booking.id);
    if (completed) {
      await sendRentalCompletedEmail(completed, settings).catch(console.error);
    }
  });
  // An expired card hold couldn't be charged: the booking page says to collect it.
  const hold = unsettled ? "&hold=unsettled" : holdExpired ? "&hold=expired" : "";
  redirect(`/admin/bookings/${booking.id}?returned=1${hold}`);
}

// After a return whose card deposit couldn't be settled (Stripe was unreachable): settles it
// now, keeping at most what was held and what the customer still owes.
export async function settleDepositAfterReturn(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const bookingId = formData.get("id");
  if (!isUuid(bookingId)) {
    throw new Error("Booking not found.");
  }
  const [staff, booking] = await Promise.all([requireStaff(), getBooking(bookingId)]);
  if (!booking) {
    throw new Error("Booking not found.");
  }
  if (booking.status !== "completed" || !(await hasCardDeposit(booking.id))) {
    return { error: "There's no deposit left to settle on this booking." };
  }
  const ledger = await bookingLedger(booking.id, booking.total);
  const keep = parseMoney(formReader(formData)("depositKeep") || "0", booking.currency);
  if (keep === null || keep > ledger.depositHeld) {
    return { error: "The amount kept from the deposit can't be more than the deposit." };
  }
  if (keep > ledger.due) {
    return {
      error: `The customer owes ${formatMoney(ledger.due, booking.currency)}, so you can't keep more than that from the deposit.`,
    };
  }
  let result: Awaited<ReturnType<typeof settleCardDeposit>>;
  try {
    result = await settleCardDeposit(booking.id, keep, staff.id);
  } catch (error) {
    console.error("Settling the card deposit failed:", error);
    return { error: "Stripe couldn't be reached. Please try again in a moment." };
  }
  redirect(`/admin/bookings/${booking.id}${result?.holdExpired ? "?hold=expired" : ""}`);
}
