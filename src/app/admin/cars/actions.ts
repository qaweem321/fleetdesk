"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { atomic } from "@/db/atomic";
import { carModelPhotos, carModels, files } from "@/db/schema";
import { type ActionState, isForeignKeyViolation } from "@/lib/action-state";
import { parseCarModelInput } from "@/lib/fleet/input";
import { formReader } from "@/lib/form-input";
import { requireStaff } from "@/lib/session";
import { requireSettings } from "@/lib/settings";
import { deleteFiles } from "@/lib/storage";
import { isUuid } from "@/lib/uuid";

const LIST = "/admin/cars";
const MAX_PHOTOS = 12;

function modelId(value: unknown) {
  const id = String(value);
  if (!isUuid(id)) {
    throw new Error("Car model not found.");
  }
  return id;
}

// The photo ids in the order the form sent them, keeping only real public uploads.
async function readPhotoIds(formData: FormData) {
  const ids = [...new Set(formData.getAll("photos").map(String))]
    .filter(isUuid)
    .slice(0, MAX_PHOTOS);
  if (ids.length === 0) {
    return [];
  }
  const found = await db
    .select({ id: files.id })
    .from(files)
    .where(and(inArray(files.id, ids), eq(files.visibility, "public")));
  const valid = new Set(found.map((file) => file.id));
  return ids.filter((id) => valid.has(id));
}

// Replaces a model's photos with the given list, and deletes photos that were removed.
async function savePhotos(id: string, photoIds: string[]) {
  const before = await db
    .select({ fileId: carModelPhotos.fileId })
    .from(carModelPhotos)
    .where(eq(carModelPhotos.carModelId, id));
  await atomic((tx) => [
    tx.delete(carModelPhotos).where(eq(carModelPhotos.carModelId, id)),
    ...photoIds.map((fileId, position) =>
      tx.insert(carModelPhotos).values({ carModelId: id, fileId, position }),
    ),
  ]);
  const removed = before
    .map((photo) => photo.fileId)
    .filter((fileId) => !photoIds.includes(fileId));
  await deleteFiles(removed);
}

export async function createCarModel(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const [, settings] = await Promise.all([requireStaff("fleet:manage"), requireSettings()]);
  const parsed = parseCarModelInput(formReader(formData), settings.currency);
  if ("error" in parsed) {
    return parsed;
  }
  const [created] = await db
    .insert(carModels)
    .values(parsed.values)
    .returning({ id: carModels.id });
  await savePhotos(created.id, await readPhotoIds(formData));
  revalidatePath(LIST);
  redirect(`${LIST}/${created.id}`);
}

export async function updateCarModel(
  id: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const [, settings] = await Promise.all([requireStaff("fleet:manage"), requireSettings()]);
  const parsed = parseCarModelInput(formReader(formData), settings.currency);
  if ("error" in parsed) {
    return parsed;
  }
  const [photoIds] = await Promise.all([
    readPhotoIds(formData),
    db
      .update(carModels)
      .set(parsed.values)
      .where(eq(carModels.id, modelId(id))),
  ]);
  await savePhotos(id, photoIds);
  revalidatePath(LIST);
  revalidatePath(`${LIST}/${id}`);
  return { success: "Car model saved." };
}

export async function setCarModelActive(formData: FormData) {
  await requireStaff("fleet:manage");
  const id = modelId(formData.get("id"));
  await db
    .update(carModels)
    .set({ active: formData.get("active") === "true" })
    .where(eq(carModels.id, id));
  revalidatePath(LIST);
  revalidatePath(`${LIST}/${id}`);
}

// Only possible while the model has no vehicles (the database refuses otherwise).
export async function deleteCarModel(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireStaff("fleet:manage");
  const id = modelId(formData.get("id"));
  const photos = await db
    .select({ fileId: carModelPhotos.fileId })
    .from(carModelPhotos)
    .where(eq(carModelPhotos.carModelId, id));
  try {
    await db.delete(carModels).where(eq(carModels.id, id));
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      return { error: "Vehicles or bookings still use this model. Hide it instead." };
    }
    throw error;
  }
  await deleteFiles(photos.map((photo) => photo.fileId));
  revalidatePath(LIST);
  redirect(LIST);
}
