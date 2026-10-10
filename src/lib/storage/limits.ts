// Shared by the server (checks) and next.config.ts (request size). Keep this file free of
// imports so the config can load it.

// Vercel refuses requests over 4.5 MB, so one upload stays under 4 MB. Photos are made smaller
// in the browser before uploading (see src/components/photo-upload.tsx), usually to ~300 KB.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export type ImageType = "image/jpeg" | "image/png" | "image/webp";

// The type is read from the file's first bytes, not from its name or the browser's claim,
// so a renamed script can't pass as a photo.
export function detectImageType(bytes: Uint8Array): ImageType | null {
  const starts = (...values: number[]) => values.every((value, index) => bytes[index] === value);
  if (starts(0xff, 0xd8, 0xff)) {
    return "image/jpeg";
  }
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) {
    return "image/png";
  }
  // "RIFF" .... "WEBP"
  const isRiff = starts(0x52, 0x49, 0x46, 0x46);
  const isWebp = bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  if (isRiff && isWebp) {
    return "image/webp";
  }
  return null;
}
