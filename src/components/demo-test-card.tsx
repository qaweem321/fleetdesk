"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { demoTestCard } from "@/lib/demo";

const messages = {
  idle: "",
  copied: "Copied. Paste it into the card number box.",
  select: "Selected. Press Ctrl+C (or ⌘C on a Mac) to copy.",
};

// Shown next to "Upgrade to Pro" in demo mode. The checkout page belongs to the payment
// provider, so we can't show these details there: copy them before leaving.
export function DemoTestCard() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<keyof typeof messages>("idle");

  async function copyNumber() {
    try {
      await navigator.clipboard.writeText(demoTestCard.number.replaceAll(" ", ""));
      setStatus("copied");
      return;
    } catch {
      // Some browsers block the clipboard API. Fall back to selecting the number.
    }
    inputRef.current?.select();
    setStatus(document.execCommand("copy") ? "copied" : "select");
  }

  return (
    <div className="mt-4 rounded-lg border border-border bg-muted p-3 text-sm">
      <p className="font-medium">Demo test card (no real money)</p>
      <div className="mt-2 flex gap-2">
        <Input
          ref={inputRef}
          readOnly
          value={demoTestCard.number}
          aria-label="Test card number"
          onFocus={(event) => event.currentTarget.select()}
          className="min-w-0 flex-1 font-mono"
        />
        <Button type="button" variant="outline" onClick={copyNumber}>
          Copy
        </Button>
      </div>
      <p aria-live="polite" className="mt-1 min-h-5 text-success">
        {messages[status]}
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-muted-foreground">
        <dt>Expiry</dt>
        <dd className="font-mono text-foreground">{demoTestCard.expiry} (any future date)</dd>
        <dt>CVC</dt>
        <dd className="font-mono text-foreground">{demoTestCard.cvc} (any 3 digits)</dd>
      </dl>
      <p className="mt-2 text-subtle-foreground">Any name and address work too.</p>
    </div>
  );
}
