"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { requireStaff } from "@/lib/session";
import { type SaveResult, saveImage } from "@/lib/storage";
import { isUuid } from "@/lib/uuid";

// Car photos and the logo: shown on the public website.
export async function uploadPublicPhoto(formData: FormData): Promise<SaveResult> {
  const user = await requireStaff();
  const file = formData.get("photo");
  if (!(file instanceof File)) {
    return { error: "Please choose a photo." };
  }
  return saveImage({ file, visibility: "public", uploadedById: user.id });
}

// Inspection photos: private, but the customer of the booking may see them (they're evidence
// for both sides).
export async function uploadInspectionPhoto(
  bookingId: string,
  formData: FormData,
): Promise<SaveResult> {
  const user = await requireStaff();
  const file = formData.get("photo");
  if (!(file instanceof File) || !isUuid(bookingId)) {
    return { error: "Please choose a photo." };
  }
  const [booking] = await db
    .select({ customerId: bookings.customerId })
    .from(bookings)
    .where(eq(bookings.id, bookingId));
  if (!booking) {
    return { error: "Booking not found." };
  }
  return saveImage({
    file,
    visibility: "private",
    ownerId: booking.customerId,
    uploadedById: user.id,
  });
}
