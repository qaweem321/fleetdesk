import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { agreements, bookingCharges, inspectionPhotos, inspections } from "@/db/schema";
import { fileUrl } from "@/lib/storage";

// A booking's inspections (pickup and return), each with its photos.
export async function getInspections(bookingId: string) {
  const rows = await db.select().from(inspections).where(eq(inspections.bookingId, bookingId));
  const photos =
    rows.length > 0
      ? await db
          .select()
          .from(inspectionPhotos)
          .where(
            inArray(
              inspectionPhotos.inspectionId,
              rows.map((row) => row.id),
            ),
          )
          .orderBy(asc(inspectionPhotos.position))
      : [];
  const withPhotos = rows.map((row) => ({
    ...row,
    photos: photos
      .filter((photo) => photo.inspectionId === row.id)
      .map((photo) => ({ id: photo.fileId, url: fileUrl(photo.fileId) })),
  }));
  return {
    pickup: withPhotos.find((row) => row.kind === "pickup") ?? null,
    back: withPhotos.find((row) => row.kind === "return") ?? null,
  };
}

export async function getAgreement(bookingId: string) {
  const [agreement] = await db.select().from(agreements).where(eq(agreements.bookingId, bookingId));
  return agreement ?? null;
}

export async function listCharges(bookingId: string) {
  return db
    .select()
    .from(bookingCharges)
    .where(eq(bookingCharges.bookingId, bookingId))
    .orderBy(asc(bookingCharges.createdAt));
}
