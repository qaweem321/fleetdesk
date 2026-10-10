"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/action-state";
import { DOCUMENT_FIELDS, ownDocumentIds, submitDriverDetails } from "@/lib/drivers/profile";
import { parseDriverInput } from "@/lib/drivers/rules";
import { formReader } from "@/lib/form-input";
import { requireUser } from "@/lib/session";
import { requireSettings } from "@/lib/settings";
import { localDateKey } from "@/lib/time-zone";

export async function saveDriverDetails(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const [user, settings] = await Promise.all([requireUser(), requireSettings()]);
  const read = formReader(formData);
  const parsed = parseDriverInput(read, localDateKey(new Date(), settings.timeZone));
  if ("error" in parsed) {
    return parsed;
  }
  const chosen = Object.fromEntries(DOCUMENT_FIELDS.map((field) => [field, read(field) || null]));
  const owned = await ownDocumentIds(user.id, Object.values(chosen));
  const documents = Object.fromEntries(
    DOCUMENT_FIELDS.map((field) => [
      field,
      chosen[field] && owned.has(chosen[field]) ? chosen[field] : null,
    ]),
  ) as Record<(typeof DOCUMENT_FIELDS)[number], string | null>;
  if (!documents.licenseFrontFileId || !documents.licenseBackFileId) {
    return { error: "Please add photos of the front and the back of your license." };
  }
  await submitDriverDetails(user.id, parsed.values, documents);
  revalidatePath("/account/driver");
  return { success: "Thank you! We'll check your license before your pickup." };
}
