"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { locations } from "@/db/schema";
import { type ActionState, isForeignKeyViolation } from "@/lib/action-state";
import { parseLocationInput } from "@/lib/fleet/input";
import { formReader } from "@/lib/form-input";
import { requireStaff } from "@/lib/session";
import { isUuid } from "@/lib/uuid";

const LIST = "/admin/locations";

function locationId(value: unknown) {
  const id = String(value);
  if (!isUuid(id)) {
    throw new Error("Location not found.");
  }
  return id;
}

export async function createLocation(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireStaff("fleet:manage");
  const parsed = parseLocationInput(formReader(formData));
  if ("error" in parsed) {
    return parsed;
  }
  await db.insert(locations).values(parsed.values);
  revalidatePath(LIST);
  redirect(LIST);
}

export async function updateLocation(
  id: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireStaff("fleet:manage");
  const parsed = parseLocationInput(formReader(formData));
  if ("error" in parsed) {
    return parsed;
  }
  await db
    .update(locations)
    .set(parsed.values)
    .where(eq(locations.id, locationId(id)));
  revalidatePath(LIST);
  return { success: "Location saved." };
}

export async function setLocationActive(formData: FormData) {
  await requireStaff("fleet:manage");
  const id = locationId(formData.get("id"));
  await db
    .update(locations)
    .set({ active: formData.get("active") === "true" })
    .where(eq(locations.id, id));
  revalidatePath(LIST);
  revalidatePath(`${LIST}/${id}`);
}

// Only possible while no vehicle is based there (the database refuses otherwise).
export async function deleteLocation(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireStaff("fleet:manage");
  try {
    await db.delete(locations).where(eq(locations.id, locationId(formData.get("id"))));
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      return { error: "Vehicles or bookings still use this location. Deactivate it instead." };
    }
    throw error;
  }
  revalidatePath(LIST);
  redirect(LIST);
}
