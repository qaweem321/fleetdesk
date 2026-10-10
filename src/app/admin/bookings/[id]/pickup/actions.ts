"use server";

import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { db } from "@/db";
import { atomic } from "@/db/atomic";
import {
  agreements,
  bookings,
  files,
  inspectionPhotos,
  inspections,
  payments,
  vehicles,
} from "@/db/schema";
import { type ActionState, isExclusionViolation } from "@/lib/action-state";
import { getBooking } from "@/lib/bookings/queries";
import { clientIp } from "@/lib/client-ip";
import { approveAtCounter, getDriverProfile } from "@/lib/drivers/profile";
import { driverReadinessProblems } from "@/lib/drivers/rules";
import { formReader } from "@/lib/form-input";
import { sendRentalStartedEmail } from "@/lib/notifications/booking-emails";
import { buildAgreementText } from "@/lib/operations/agreement";
import { parseInspectionInput, parseSignature } from "@/lib/operations/input";
import { holdDepositOnSavedCard } from "@/lib/payments/deposits";
import { requireStaff } from "@/lib/session";
import { requireSettings } from "@/lib/settings";
import { saveImage } from "@/lib/storage";
import { localDateKey } from "@/lib/time-zone";
import { isUuid } from "@/lib/uuid";

const COUNTER_DEPOSIT_METHODS = ["cash", "card_terminal", "other"] as const;

// Inspection photos must be private uploads for this booking's customer.
async function readPhotoIds(formData: FormData, customerId: string | null) {
  const ids = [...new Set(formData.getAll("photos").map(String))].filter(isUuid).slice(0, 30);
  if (ids.length === 0 || !customerId) {
    return [];
  }
  const found = await db
    .select({ id: files.id })
    .from(files)
    .where(
      and(inArray(files.id, ids), eq(files.visibility, "private"), eq(files.ownerId, customerId)),
    );
  const valid = new Set(found.map((file) => file.id));
  return ids.filter((id) => valid.has(id));
}

// Hands the car over: checks the driver, records the car's state, saves the signed agreement,
// takes the deposit and marks the booking as picked up. Everything after the deposit is saved in
// one transaction.
export async function completePickup(
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
  if (booking.status !== "confirmed") {
    return { error: "Only confirmed bookings can be picked up." };
  }
  const read = formReader(formData);

  const vehicleId = read("vehicleId");
  const [vehicle] = isUuid(vehicleId)
    ? await db.select().from(vehicles).where(eq(vehicles.id, vehicleId))
    : [];
  if (!vehicle || vehicle.carModelId !== booking.carModelId || vehicle.status !== "available") {
    return { error: "Please choose an available car of the booked model." };
  }
  const inspection = parseInspectionInput(read, vehicle.mileage);
  if ("error" in inspection) {
    return inspection;
  }

  const profile = booking.customerId ? await getDriverProfile(booking.customerId) : null;
  const problems = driverReadinessProblems(profile, {
    pickupDate: localDateKey(booking.pickupAt, settings.timeZone),
    returnDate: localDateKey(booking.returnAt, settings.timeZone),
    minAge: settings.minDriverAge,
  });
  const licenseChecked = read("licenseChecked") === "on";
  if (problems.length > 0 && !licenseChecked) {
    return { error: "Please check the driver's license in person and tick the box." };
  }

  const signerName = read("signerName");
  const signature = parseSignature(read("signature"));
  if (!signerName || signerName.length > 100) {
    return { error: "Please type the name of the person signing." };
  }
  if (!signature) {
    return { error: "Please ask the customer to sign the agreement." };
  }

  const depositMethod = read("depositMethod");
  if (
    booking.depositAmount > 0 &&
    !["card", "none", ...COUNTER_DEPOSIT_METHODS].includes(depositMethod)
  ) {
    return { error: "Please choose how the deposit is taken." };
  }

  // A different car of the same model: the database refuses it if that car is booked meanwhile.
  if (vehicle.id !== booking.vehicleId) {
    try {
      await db
        .update(bookings)
        .set({ vehicleId: vehicle.id, updatedAt: new Date() })
        .where(eq(bookings.id, booking.id));
    } catch (error) {
      if (isExclusionViolation(error)) {
        return {
          error: `${vehicle.plate} is booked during this rental. Please choose another car.`,
        };
      }
      throw error;
    }
  }

  if (booking.depositAmount > 0 && depositMethod === "card") {
    const problem = await holdDepositOnSavedCard({
      bookingId: booking.id,
      amount: booking.depositAmount,
      currency: booking.currency,
      staffId: staff.id,
    });
    if (problem) {
      return { error: problem };
    }
  }

  const savedSignature = await saveImage({
    file: new File([new Uint8Array(signature)], "signature.png", { type: "image/png" }),
    visibility: "private",
    ownerId: booking.customerId,
    uploadedById: staff.id,
  });
  if ("error" in savedSignature) {
    return { error: "The signature couldn't be saved. Please sign again." };
  }

  const photoIds = await readPhotoIds(formData, booking.customerId);
  const agreementText = buildAgreementText({
    businessName: settings.businessName,
    businessAddress: settings.address,
    reference: booking.reference,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    customerPhone: booking.customerPhone,
    car: `${booking.make} ${booking.model}`,
    plate: vehicle.plate,
    pickupAt: booking.pickupAt,
    returnAt: booking.returnAt,
    pickupLocation: booking.pickupLocationName,
    returnLocation: booking.returnLocationName,
    mileage: inspection.values.mileage,
    fuelLevel: inspection.values.fuelLevel,
    distanceUnit: settings.distanceUnit,
    total: booking.total,
    depositAmount: depositMethod === "none" ? 0 : booking.depositAmount,
    currency: booking.currency,
    timeZone: settings.timeZone,
    terms: settings.agreementTerms,
  });
  const signedFromIp = clientIp(await headers());
  const inspectionId = randomUUID();
  const now = new Date();
  const counterDeposit = COUNTER_DEPOSIT_METHODS.find((method) => method === depositMethod);

  await atomic((tx) => [
    tx.insert(inspections).values({
      id: inspectionId,
      bookingId: booking.id,
      kind: "pickup",
      ...inspection.values,
      createdById: staff.id,
    }),
    ...photoIds.map((fileId, position) =>
      tx.insert(inspectionPhotos).values({ inspectionId, fileId, position }),
    ),
    tx.insert(agreements).values({
      bookingId: booking.id,
      text: agreementText,
      signerName,
      signatureFileId: savedSignature.id,
      // Kept as evidence: where the agreement was signed from.
      signedFromIp,
      staffId: staff.id,
    }),
    tx
      .update(bookings)
      .set({ status: "active", pickedUpAt: now, updatedAt: now })
      .where(eq(bookings.id, booking.id)),
    tx
      .update(vehicles)
      .set({ mileage: inspection.values.mileage })
      .where(eq(vehicles.id, vehicle.id)),
    ...(booking.depositAmount > 0 && counterDeposit
      ? [
          tx.insert(payments).values({
            bookingId: booking.id,
            kind: "deposit_hold",
            method: counterDeposit,
            amount: booking.depositAmount,
            description: "Deposit taken at the counter",
            createdById: staff.id,
          }),
        ]
      : []),
  ]);
  if (problems.length > 0 && licenseChecked && booking.customerId) {
    await approveAtCounter(booking.customerId, staff.id);
  }
  after(() => sendRentalStartedEmail(booking, agreementText, settings).catch(console.error));
  redirect(`/admin/bookings/${booking.id}?picked=1`);
}
