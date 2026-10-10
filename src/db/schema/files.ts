// Uploaded files: car photos, inspection photos, driver's licenses, signatures, the logo.
// The bytes live wherever STORAGE_DRIVER says (src/lib/storage); this table describes them.
import {
  customType,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

// Public files (car photos, the logo) can be shown to anyone. Private files (licenses,
// inspection photos, signatures) only to staff and the customer who owns them.
export const fileVisibilityEnum = pgEnum("file_visibility", ["public", "private"]);

export const files = pgTable(
  "files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    visibility: fileVisibilityEnum("visibility").notNull(),
    // The customer a private file belongs to (their license), so they may see it too.
    ownerId: text("owner_id").references(() => users.id, { onDelete: "cascade" }),
    contentType: text("content_type").notNull(),
    size: integer("size").notNull(),
    // Which driver stored it ("database", "local" or "s3") and under which key.
    driver: text("driver").notNull(),
    storageKey: text("storage_key").notNull(),
    uploadedById: text("uploaded_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("files_owner_id_idx").on(table.ownerId)],
);

const bytea = customType<{ data: Buffer }>({ dataType: () => "bytea" });

// The file bytes when STORAGE_DRIVER is "database" (the default). Kept apart from `files` so
// listing files never loads their contents.
export const fileBlobs = pgTable("file_blobs", {
  fileId: uuid("file_id")
    .primaryKey()
    .references(() => files.id, { onDelete: "cascade" }),
  data: bytea("data").notNull(),
});
