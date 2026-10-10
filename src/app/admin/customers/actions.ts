"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import type { ActionState } from "@/lib/action-state";
import { reviewDriver } from "@/lib/drivers/profile";
import { getRenter } from "@/lib/drivers/queries";
import { formReader } from "@/lib/form-input";
import { sendLicenseReviewedEmail } from "@/lib/notifications/driver-emails";
import { requireStaff } from "@/lib/session";
import { requireSettings } from "@/lib/settings";

// Staff accept or turn down a customer's license. A refusal needs a reason: the customer sees
// it and fixes exactly that.
export async function reviewLicense(
  userId: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const [staff, settings, renter] = await Promise.all([
    requireStaff(),
    requireSettings(),
    getRenter(userId),
  ]);
  if (!renter) {
    throw new Error("Customer not found.");
  }
  const read = formReader(formData);
  const decision = read("decision") === "approve" ? "approved" : "rejected";
  const note = read("note");
  if (decision === "rejected" && !note) {
    return { error: "Please say what's wrong, so the customer can fix it." };
  }
  if (note.length > 300) {
    return { error: "The note can be at most 300 characters." };
  }
  if (!(await reviewDriver(userId, decision, note || null, staff.id))) {
    return { error: "This customer hasn't sent their license yet." };
  }
  after(() =>
    sendLicenseReviewedEmail(renter, decision, note || null, settings).catch(console.error),
  );
  revalidatePath(`/admin/customers/${userId}`);
  revalidatePath("/admin/customers");
  return {
    success: decision === "approved" ? "License accepted." : "The customer was asked to fix it.",
  };
}
