// A customer's driver details and documents, checked by staff (or Stripe Identity) before they
// get the keys. One row per customer, shared by all their bookings.
import { date, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { files } from "./files";

export const verificationStatusEnum = pgEnum("verification_status", [
  // Sent by the customer, waiting for staff to look.
  "pending",
  "approved",
  // Something's wrong (blurry photo, expired license...): the note says what; the customer
  // fixes it and sends again.
  "rejected",
]);

export const driverProfiles = pgTable("driver_profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  // Calendar dates ("1990-05-17").
  dateOfBirth: date("date_of_birth"),
  licenseNumber: text("license_number"),
  licenseCountry: text("license_country"),
  licenseExpiresOn: date("license_expires_on"),
  // Photos of the license (front and back) and, optionally, an ID card or passport. Private
  // files: only staff and the customer can see them.
  licenseFrontFileId: uuid("license_front_file_id").references(() => files.id, {
    onDelete: "set null",
  }),
  licenseBackFileId: uuid("license_back_file_id").references(() => files.id, {
    onDelete: "set null",
  }),
  idDocumentFileId: uuid("id_document_file_id").references(() => files.id, {
    onDelete: "set null",
  }),
  // Empty until the customer sends their documents for checking.
  status: verificationStatusEnum("status"),
  reviewNote: text("review_note"),
  // "staff" or "stripe_identity": who approved it.
  verifiedBy: text("verified_by"),
  reviewedById: text("reviewed_by_id").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  stripeVerificationSessionId: text("stripe_verification_session_id"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
