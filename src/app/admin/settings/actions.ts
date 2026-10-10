"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { businessSettings, files } from "@/db/schema";
import type { ActionState } from "@/lib/action-state";
import { parseBusinessInput } from "@/lib/business-input";
import { formReader } from "@/lib/form-input";
import { requireStaff } from "@/lib/session";
import { requireSettings, settingsChanged } from "@/lib/settings";
import { deleteFiles } from "@/lib/storage";
import { isUuid } from "@/lib/uuid";

// The logo must be a public photo that exists (ids come from the browser).
async function checkLogo(value: string) {
  if (!value) {
    return { logoFileId: null };
  }
  if (!isUuid(value)) {
    return { error: "Please upload the logo again." };
  }
  const [file] = await db
    .select({ visibility: files.visibility })
    .from(files)
    .where(eq(files.id, value));
  if (file?.visibility !== "public") {
    return { error: "Please upload the logo again." };
  }
  return { logoFileId: value };
}

export async function updateSettings(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const [, current] = await Promise.all([requireStaff("settings:update"), requireSettings()]);
  const read = formReader(formData);
  const parsed = parseBusinessInput(read);
  if ("error" in parsed) {
    return parsed;
  }
  const logo = await checkLogo(read("logo"));
  if ("error" in logo) {
    return { error: logo.error };
  }

  await db
    .update(businessSettings)
    .set({ ...parsed.values, logoFileId: logo.logoFileId, updatedAt: new Date() })
    .where(eq(businessSettings.id, 1));
  // A replaced or removed logo is no longer used anywhere.
  if (current.logoFileId && current.logoFileId !== logo.logoFileId) {
    await deleteFiles([current.logoFileId]);
  }
  settingsChanged();
  revalidatePath("/", "layout");
  return { success: "Settings saved." };
}

const PAYMENT_OPTIONS = ["pay_at_pickup", "online", "both"] as const;

export async function updatePaymentOptions(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireStaff("settings:update");
  const value = String(formData.get("paymentOptions"));
  const paymentOptions = PAYMENT_OPTIONS.find((option) => option === value);
  if (!paymentOptions) {
    return { error: "Please choose how customers pay." };
  }
  await db
    .update(businessSettings)
    .set({
      paymentOptions,
      stripeIdentityEnabled: formData.get("stripeIdentityEnabled") === "on",
      updatedAt: new Date(),
    })
    .where(eq(businessSettings.id, 1));
  settingsChanged();
  return { success: "Payment options saved." };
}
