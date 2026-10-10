"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { vehicleBlocks, vehicles } from "@/db/schema";
import { type ActionState, isForeignKeyViolation, isUniqueViolation } from "@/lib/action-state";
import { parseBlockInput, parseVehicleInput, type VehicleInput } from "@/lib/fleet/input";
import { formReader } from "@/lib/form-input";
import { requireStaff } from "@/lib/session";
import { requireSettings } from "@/lib/settings";
import { isUuid } from "@/lib/uuid";

const LIST = "/admin/vehicles";

function vehicleId(value: unknown) {
  const id = String(value);
  if (!isUuid(id)) {
    throw new Error("Vehicle not found.");
  }
  return id;
}

function readVehicle(formData: FormData) {
  return parseVehicleInput(formReader(formData), new Date().getUTCFullYear());
}

// Saves a vehicle, turning database refusals into messages: a plate that's already used,
// or a model/location that was deleted meanwhile.
async function saveVehicle(
  write: () => Promise<unknown>,
  values: VehicleInput,
): Promise<ActionState | null> {
  try {
    await write();
    return null;
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: `Another vehicle already has the plate ${values.plate}.` };
    }
    if (isForeignKeyViolation(error)) {
      return { error: "That car model or location no longer exists. Please choose again." };
    }
    throw error;
  }
}

export async function createVehicle(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireStaff("fleet:manage");
  const parsed = readVehicle(formData);
  if ("error" in parsed) {
    return parsed;
  }
  let createdId = "";
  const problem = await saveVehicle(async () => {
    const [created] = await db
      .insert(vehicles)
      .values(parsed.values)
      .returning({ id: vehicles.id });
    createdId = created.id;
  }, parsed.values);
  if (problem) {
    return problem;
  }
  revalidatePath(LIST);
  revalidatePath(`/admin/cars/${parsed.values.carModelId}`);
  redirect(`${LIST}/${createdId}`);
}

export async function updateVehicle(
  id: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireStaff("fleet:manage");
  const parsed = readVehicle(formData);
  if ("error" in parsed) {
    return parsed;
  }
  const problem = await saveVehicle(
    () =>
      db
        .update(vehicles)
        .set(parsed.values)
        .where(eq(vehicles.id, vehicleId(id))),
    parsed.values,
  );
  if (problem) {
    return problem;
  }
  revalidatePath(LIST);
  revalidatePath(`${LIST}/${id}`);
  return { success: "Vehicle saved." };
}

// Only possible while the vehicle has no bookings (the database refuses otherwise).
export async function deleteVehicle(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireStaff("fleet:manage");
  try {
    await db.delete(vehicles).where(eq(vehicles.id, vehicleId(formData.get("id"))));
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      return { error: "This vehicle has bookings. Set its status to Retired instead." };
    }
    throw error;
  }
  revalidatePath(LIST);
  redirect(LIST);
}

export async function addBlock(
  id: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const [user, settings] = await Promise.all([requireStaff("fleet:manage"), requireSettings()]);
  const parsed = parseBlockInput(formReader(formData), settings.timeZone);
  if ("error" in parsed) {
    return parsed;
  }
  await db
    .insert(vehicleBlocks)
    .values({ ...parsed.values, vehicleId: vehicleId(id), createdById: user.id });
  revalidatePath(`${LIST}/${id}`);
  return { success: "Blocked. The vehicle won't be offered during that time." };
}

export async function removeBlock(formData: FormData) {
  await requireStaff("fleet:manage");
  const id = vehicleId(formData.get("vehicleId"));
  const blockId = String(formData.get("blockId"));
  if (!isUuid(blockId)) {
    throw new Error("Block not found.");
  }
  await db
    .delete(vehicleBlocks)
    .where(and(eq(vehicleBlocks.id, blockId), eq(vehicleBlocks.vehicleId, id)));
  revalidatePath(`${LIST}/${id}`);
}
