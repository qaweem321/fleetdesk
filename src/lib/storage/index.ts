import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { files } from "@/db/schema";
import { isStaff, type Role } from "@/lib/permissions";
import { isStorageDriverName, storageDriverName } from "./driver-name";
import { getDriver } from "./drivers";
import { detectImageType, MAX_UPLOAD_BYTES } from "./limits";

type Visibility = (typeof files.$inferSelect)["visibility"];

type SaveImage = {
  file: File;
  visibility: Visibility;
  // The customer a private file belongs to, so they can see it too.
  ownerId?: string | null;
  uploadedById: string;
};

export type SaveResult = { id: string } | { error: string };

// Checks and stores one uploaded photo. Returns its id, or a message for the person.
export async function saveImage({
  file,
  visibility,
  ownerId = null,
  uploadedById,
}: SaveImage): Promise<SaveResult> {
  if (file.size === 0) {
    return { error: "Please choose a photo." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: "That photo is too large (4 MB at most)." };
  }
  const data = Buffer.from(await file.arrayBuffer());
  const contentType = detectImageType(data);
  if (!contentType) {
    return { error: "Please upload a JPEG, PNG or WebP photo." };
  }

  const id = randomUUID();
  const driverName = storageDriverName();
  // The database driver keys bytes by file id; the others by a dated path, which keeps
  // folders small and makes buckets easy to browse.
  const now = new Date();
  const storageKey =
    driverName === "database"
      ? id
      : `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${id}`;

  await db.insert(files).values({
    id,
    visibility,
    ownerId,
    contentType,
    size: data.length,
    driver: driverName,
    storageKey,
    uploadedById,
  });
  try {
    await getDriver(driverName).put(storageKey, data, contentType);
  } catch (error) {
    await db.delete(files).where(eq(files.id, id));
    throw error;
  }
  return { id };
}

export async function findFile(id: string) {
  const [file] = await db.select().from(files).where(eq(files.id, id));
  return file ?? null;
}

export async function readFileData(file: typeof files.$inferSelect) {
  if (!isStorageDriverName(file.driver)) {
    return null;
  }
  return getDriver(file.driver).get(file.storageKey);
}

type Viewer = { id: string; role: Role } | null;

// Public files: anyone. Private files: staff, and the customer they belong to.
export function canViewFile(
  file: Pick<typeof files.$inferSelect, "visibility" | "ownerId">,
  viewer: Viewer,
) {
  if (file.visibility === "public") {
    return true;
  }
  return Boolean(viewer && (isStaff(viewer.role) || file.ownerId === viewer.id));
}

export async function deleteFiles(ids: string[]) {
  if (ids.length === 0) {
    return;
  }
  const found = await db.select().from(files).where(inArray(files.id, ids));
  await Promise.all(
    found.map((file) =>
      isStorageDriverName(file.driver) ? getDriver(file.driver).remove(file.storageKey) : null,
    ),
  );
  await db.delete(files).where(inArray(files.id, ids));
}

// Where the browser loads a file from (src/app/files/[id]/route.ts checks who may see it).
export function fileUrl(id: string) {
  return `/files/${id}`;
}
