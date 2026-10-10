"use server";

import { requireStaff } from "@/lib/session";
import { type SaveResult, saveImage } from "@/lib/storage";

// Car photos and the logo: shown on the public website.
export async function uploadPublicPhoto(formData: FormData): Promise<SaveResult> {
  const user = await requireStaff();
  const file = formData.get("photo");
  if (!(file instanceof File)) {
    return { error: "Please choose a photo." };
  }
  return saveImage({ file, visibility: "public", uploadedById: user.id });
}
