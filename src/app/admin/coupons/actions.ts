"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { coupons } from "@/db/schema";
import { type ActionState, isUniqueViolation } from "@/lib/action-state";
import { formReader } from "@/lib/form-input";
import { parseCouponInput } from "@/lib/pricing/input";
import { requireStaff } from "@/lib/session";
import { requireSettings } from "@/lib/settings";
import { isUuid } from "@/lib/uuid";

const LIST = "/admin/coupons";

function couponId(value: unknown) {
  const id = String(value);
  if (!isUuid(id)) {
    throw new Error("Coupon not found.");
  }
  return id;
}

export async function createCoupon(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const [, settings] = await Promise.all([requireStaff("pricing:manage"), requireSettings()]);
  const parsed = parseCouponInput(formReader(formData), settings.currency);
  if ("error" in parsed) {
    return parsed;
  }
  try {
    await db.insert(coupons).values(parsed.values);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: `There's already a coupon ${parsed.values.code}.` };
    }
    throw error;
  }
  revalidatePath(LIST);
  return { success: `Coupon ${parsed.values.code} created.` };
}

export async function setCouponActive(formData: FormData) {
  await requireStaff("pricing:manage");
  await db
    .update(coupons)
    .set({ active: formData.get("active") === "true" })
    .where(eq(coupons.id, couponId(formData.get("id"))));
  revalidatePath(LIST);
}

// Bookings keep the code and discount they got, so deleting a coupon is always safe.
export async function deleteCoupon(formData: FormData) {
  await requireStaff("pricing:manage");
  await db.delete(coupons).where(eq(coupons.id, couponId(formData.get("id"))));
  revalidatePath(LIST);
}
