"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { businessSettings, files } from "@/db/schema";
import type { ActionState } from "@/lib/action-state";
import { parseBusinessInput } from "@/lib/business-input";
import { currencyInUse } from "@/lib/currency-lock";
import { formReader } from "@/lib/form-input";
import { parseMoney } from "@/lib/money";
import { DEFAULT_AGREEMENT_TERMS } from "@/lib/operations/agreement";
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
  if (parsed.values.currency !== current.currency && (await currencyInUse())) {
    return {
      error:
        "The currency can't be changed once there are cars, extras, coupons or bookings: every price is stored in it.",
    };
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

// The rental terms customers sign at pickup, and the fuel charge used at the return.
export async function updateRentalTerms(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const [, settings] = await Promise.all([requireStaff("settings:update"), requireSettings()]);
  const terms = String(formData.get("agreementTerms") ?? "").trim();
  const fuelText = String(formData.get("fuelChargePerEighth") ?? "").trim();
  const fuelChargePerEighth = fuelText ? parseMoney(fuelText, settings.currency) : 0;
  if (terms.length > 10_000) {
    return { error: "The terms can be at most 10,000 characters." };
  }
  if (fuelChargePerEighth === null) {
    return { error: "Please enter the fuel charge as an amount like 12.00, or leave it empty." };
  }
  await db
    .update(businessSettings)
    .set({
      // The built-in template is used while this is empty.
      agreementTerms: terms && terms !== DEFAULT_AGREEMENT_TERMS ? terms : null,
      fuelChargePerEighth,
      updatedAt: new Date(),
    })
    .where(eq(businessSettings.id, 1));
  settingsChanged();
  return { success: "Rental terms saved. New agreements use them; signed ones keep their text." };
}
