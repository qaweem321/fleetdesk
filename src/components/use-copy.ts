"use client";

import { useState } from "react";

export type CopyStatus = "idle" | "copied" | "select";

// Copies text to the clipboard. Some browsers block the clipboard API; then the text in the
// given field is selected and copied the old way, or left selected for Ctrl+C.
export function useCopy() {
  const [status, setStatus] = useState<CopyStatus>("idle");

  async function copy(text: string, field: HTMLInputElement | HTMLTextAreaElement | null) {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
      return;
    } catch {
      // Fall through to selecting the text.
    }
    field?.select();
    setStatus(document.execCommand("copy") ? "copied" : "select");
  }

  return { status, copy };
}
