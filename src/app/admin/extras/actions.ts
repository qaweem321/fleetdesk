"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { extras } from "@/db/schema";
import type { ActionState } from "@/lib/action-state";
import { formReader } from "@/lib/form-input";
import { parseExtraInput } from "@/lib/pricing/input";
import { requireStaff } from "@/lib/session";
import { requireSettings } from "@/lib/settings";
import { isUuid } from "@/lib/uuid";

const LIST = "/admin/extras";

function extraId(value: unknown) {
  const id = String(value);
  if (!isUuid(id)) {
    throw new Error("Extra not found.");
  }
  return id;
}

async function readExtra(formData: FormData) {
  const [, settings] = await Promise.all([requireStaff("pricing:manage"), requireSettings()]);
  return parseExtraInput(formReader(formData), settings.currency);
}

export async function createExtra(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = await readExtra(formData);
  if ("error" in parsed) {
    return parsed;
  }
  await db.insert(extras).values(parsed.values);
  revalidatePath(LIST);
  return { success: `${parsed.values.name} added.` };
}

export async function updateExtra(
  id: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = await readExtra(formData);
  if ("error" in parsed) {
    return parsed;
  }
  await db
    .update(extras)
    .set(parsed.values)
    .where(eq(extras.id, extraId(id)));
  revalidatePath(LIST);
  return { success: "Extra saved." };
}

export async function setExtraActive(formData: FormData) {
  await requireStaff("pricing:manage");
  const id = extraId(formData.get("id"));
  await db
    .update(extras)
    .set({ active: formData.get("active") === "true" })
    .where(eq(extras.id, id));
  revalidatePath(LIST);
  revalidatePath(`${LIST}/${id}`);
}

// Bookings keep their own copy of each extra (name and price), so deleting is always safe.
export async function deleteExtra(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireStaff("pricing:manage");
  await db.delete(extras).where(eq(extras.id, extraId(formData.get("id"))));
  revalidatePath(LIST);
  redirect(LIST);
}
