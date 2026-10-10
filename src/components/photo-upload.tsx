"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { SaveResult } from "@/lib/storage";

export type UploadedPhoto = { id: string; url: string };

type Props = {
  // Name of the hidden inputs that carry the photo ids to the surrounding form.
  name: string;
  // A server action that stores one photo and returns its id.
  upload: (formData: FormData) => Promise<SaveResult>;
  initial?: UploadedPhoto[];
  max?: number;
  // Photos are made smaller than this (in pixels) before uploading.
  maxDimension?: number;
  // Keep PNGs as PNG (logos with a transparent background) instead of turning them into JPEG.
  keepPng?: boolean;
  // Opens the camera directly on phones (inspection photos).
  camera?: boolean;
  label?: string;
};

// Shrinks a photo in the browser: a 6 MB phone picture becomes ~300 KB, so uploads are fast
// even on mobile data and stay under the server's size limit.
async function shrink(file: File, maxDimension: number, keepPng: boolean): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const type = keepPng && file.type === "image/png" ? "image/png" : "image/jpeg";
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not read the photo."))),
      type,
      0.82,
    ),
  );
}

export function PhotoUpload({
  name,
  upload,
  initial = [],
  max = 10,
  maxDimension = 1600,
  keepPng = false,
  camera = false,
  label = "Add photos",
}: Props) {
  const [photos, setPhotos] = useState<UploadedPhoto[]>(initial);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const waitRef = useRef<HTMLInputElement>(null);

  // While photos are still uploading, an empty required field stops the form from being sent.
  useEffect(() => {
    waitRef.current?.setCustomValidity(
      uploading > 0 ? "Please wait until the photos finish uploading." : "",
    );
  }, [uploading]);

  async function addFiles(fileList: FileList | null) {
    const chosen = Array.from(fileList ?? []).slice(0, max - photos.length);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    if (chosen.length === 0) {
      return;
    }
    setError("");
    setUploading((count) => count + chosen.length);
    // One at a time keeps each request small, and a phone on a weak connection isn't swamped.
    for (const file of chosen) {
      try {
        const formData = new FormData();
        formData.set("photo", await shrink(file, maxDimension, keepPng), file.name);
        const result = await upload(formData);
        if ("error" in result) {
          setError(result.error);
        } else {
          const url = `/files/${result.id}`;
          setPhotos((current) => [...current, { id: result.id, url }]);
        }
      } catch {
        setError("That photo couldn't be uploaded. Please try another one.");
      } finally {
        setUploading((count) => count - 1);
      }
    }
  }

  const full = photos.length >= max;

  return (
    <div className="space-y-2">
      {photos.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {photos.map((photo, index) => (
            <li key={photo.id} className="relative">
              <input type="hidden" name={name} value={photo.id} />
              {/* biome-ignore lint/performance/noImgElement: thumbnails of our own uploads */}
              <img
                src={photo.url}
                alt={`Upload ${index + 1}`}
                className="h-20 w-28 rounded-md border border-border object-cover"
              />
              <button
                type="button"
                onClick={() =>
                  setPhotos((current) => current.filter((item) => item.id !== photo.id))
                }
                aria-label={`Remove photo ${index + 1}`}
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-xs shadow hover:bg-muted"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture={camera ? "environment" : undefined}
        multiple={max - photos.length > 1}
        onChange={(event) => addFiles(event.currentTarget.files)}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
      <input
        ref={waitRef}
        required={uploading > 0}
        value=""
        onChange={() => {}}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
      />
      {!full && (
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={uploading > 0}
        >
          {uploading > 0 ? "Uploading..." : label}
        </Button>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
