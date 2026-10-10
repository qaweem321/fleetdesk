import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { driverProfiles, files } from "@/db/schema";
import { deleteFiles, fileUrl } from "@/lib/storage";
import { isUuid } from "@/lib/uuid";
import type { DriverInput } from "./rules";

export const DOCUMENT_FIELDS = [
  "licenseFrontFileId",
  "licenseBackFileId",
  "idDocumentFileId",
] as const;
export type DocumentField = (typeof DOCUMENT_FIELDS)[number];

export async function getDriverProfile(userId: string) {
  const [profile] = await db.select().from(driverProfiles).where(eq(driverProfiles.userId, userId));
  return profile ?? null;
}

export type DriverProfile = NonNullable<Awaited<ReturnType<typeof getDriverProfile>>>;

// The document photos as links (only the customer and staff can open them).
export function documentPhotos(profile: DriverProfile | null) {
  return Object.fromEntries(
    DOCUMENT_FIELDS.map((field) => {
      const id = profile?.[field];
      return [field, id ? { id, url: fileUrl(id) } : null];
    }),
  ) as Record<DocumentField, { id: string; url: string } | null>;
}

// Only the customer's own private uploads can be attached to their profile (ids come from the
// browser).
export async function ownDocumentIds(userId: string, ids: (string | null)[]) {
  const candidates = ids.filter((id): id is string => Boolean(id && isUuid(id)));
  if (candidates.length === 0) {
    return new Set<string>();
  }
  const found = await db
    .select({ id: files.id })
    .from(files)
    .where(
      and(
        inArray(files.id, candidates),
        eq(files.ownerId, userId),
        eq(files.visibility, "private"),
      ),
    );
  return new Set(found.map((file) => file.id));
}

// Saves the driver's details and documents and sends them for checking (again): any earlier
// decision no longer applies to the new details. Replaced photos are deleted.
export async function submitDriverDetails(
  userId: string,
  values: DriverInput,
  documents: Record<DocumentField, string | null>,
) {
  const before = await getDriverProfile(userId);
  const now = new Date();
  const row = {
    ...values,
    ...documents,
    status: "pending" as const,
    reviewNote: null,
    verifiedBy: null,
    reviewedById: null,
    reviewedAt: null,
    submittedAt: now,
    updatedAt: now,
  };
  await db
    .insert(driverProfiles)
    .values({ userId, ...row })
    .onConflictDoUpdate({ target: driverProfiles.userId, set: row });
  const replaced = DOCUMENT_FIELDS.map((field) => before?.[field] ?? null).filter(
    (id): id is string => Boolean(id) && !Object.values(documents).includes(id),
  );
  await deleteFiles(replaced);
}

// A date of birth given while booking (the rest of the details can come later).
export async function saveDateOfBirth(userId: string, dateOfBirth: string) {
  await db
    .insert(driverProfiles)
    .values({ userId, dateOfBirth })
    .onConflictDoUpdate({
      target: driverProfiles.userId,
      set: { dateOfBirth, updatedAt: new Date() },
    });
}

// A staff decision on the documents. Only a profile waiting for review (or one being
// reconsidered) can change, so two staff members can't overwrite each other unknowingly.
export async function reviewDriver(
  userId: string,
  decision: "approved" | "rejected",
  note: string | null,
  staffId: string,
) {
  const updated = await db
    .update(driverProfiles)
    .set({
      status: decision,
      reviewNote: note,
      verifiedBy: decision === "approved" ? "staff" : null,
      reviewedById: staffId,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(driverProfiles.userId, userId),
        inArray(driverProfiles.status, ["pending", "approved", "rejected"]),
      ),
    )
    .returning({ userId: driverProfiles.userId });
  return updated.length > 0;
}

// Staff saw the license at the counter: the driver is approved, with or without documents
// sent online.
export async function approveAtCounter(userId: string, staffId: string) {
  const now = new Date();
  const decision = {
    status: "approved" as const,
    verifiedBy: "staff",
    reviewNote: "Checked in person at the counter.",
    reviewedById: staffId,
    reviewedAt: now,
    updatedAt: now,
  };
  await db
    .insert(driverProfiles)
    .values({ userId, submittedAt: now, ...decision })
    .onConflictDoUpdate({ target: driverProfiles.userId, set: decision });
}
