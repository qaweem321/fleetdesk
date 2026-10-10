"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { businessSettings, seasons } from "@/db/schema";
import type { ActionState } from "@/lib/action-state";
import { formReader } from "@/lib/form-input";
import { buildQuote } from "@/lib/pricing/build-quote";
import { parseRulesInput, parseSeasonInput } from "@/lib/pricing/input";
import { findOverlappingSeason } from "@/lib/pricing/queries";
import type { Quote } from "@/lib/pricing/quote";
import { parseQuoteRequest } from "@/lib/pricing/request";
import { requireStaff } from "@/lib/session";
import { requireSettings, settingsChanged } from "@/lib/settings";
import { isUuid } from "@/lib/uuid";

const PAGE = "/admin/pricing";

export async function updateRules(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireStaff("pricing:manage");
  const parsed = parseRulesInput(formReader(formData));
  if ("error" in parsed) {
    return parsed;
  }
  await db
    .update(businessSettings)
    .set({ ...parsed.values, updatedAt: new Date() })
    .where(eq(businessSettings.id, 1));
  settingsChanged();
  revalidatePath(PAGE);
  return { success: "Booking rules saved." };
}

export async function addSeason(_previous: ActionState, formData: FormData): Promise<ActionState> {
  await requireStaff("pricing:manage");
  const parsed = parseSeasonInput(formReader(formData));
  if ("error" in parsed) {
    return parsed;
  }
  const overlap = await findOverlappingSeason(parsed.values.startsOn, parsed.values.endsOn);
  if (overlap) {
    return {
      error: `These dates overlap with "${overlap.name}". Each day can be in one season only.`,
    };
  }
  await db.insert(seasons).values(parsed.values);
  revalidatePath(PAGE);
  return { success: `${parsed.values.name} added.` };
}

export async function deleteSeason(formData: FormData) {
  await requireStaff("pricing:manage");
  const id = String(formData.get("id"));
  if (!isUuid(id)) {
    throw new Error("Season not found.");
  }
  await db.delete(seasons).where(eq(seasons.id, id));
  revalidatePath(PAGE);
}

export type PreviewState = {
  error?: string;
  quote?: Quote;
  couponCode?: string | null;
  couponError?: string | null;
};

// The price calculator on the Pricing page: what a customer would pay. Booking rules (notice
// period, longest rental) aren't applied, so staff can check any dates.
export async function previewQuote(
  _previous: PreviewState,
  formData: FormData,
): Promise<PreviewState> {
  const [, settings] = await Promise.all([requireStaff("pricing:manage"), requireSettings()]);
  const parsed = parseQuoteRequest(formData.entries(), settings.timeZone);
  if ("error" in parsed) {
    return parsed;
  }
  const built = await buildQuote(parsed.request, settings, { forCustomer: false });
  if ("error" in built) {
    return built;
  }
  return {
    quote: built.quote,
    couponCode: built.coupon?.code ?? null,
    couponError: built.couponError,
  };
}
