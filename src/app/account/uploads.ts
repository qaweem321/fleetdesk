"use server";

import { rateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/lib/session";
import { type SaveResult, saveImage } from "@/lib/storage";

// A customer's license or ID photo: private, so only they and staff can see it.
export async function uploadMyDocument(formData: FormData): Promise<SaveResult> {
  const user = await requireUser();
  const file = formData.get("photo");
  if (!(file instanceof File)) {
    return { error: "Please choose a photo." };
  }
  // Enough for several tries; stops anyone filling the storage.
  const { allowed } = await rateLimit(`document-upload:${user.id}`, 30, 60 * 60);
  if (!allowed) {
    return { error: "Too many uploads. Please try again in an hour." };
  }
  return saveImage({ file, visibility: "private", ownerId: user.id, uploadedById: user.id });
}
