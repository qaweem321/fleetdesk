"use client";

import { Button } from "@/components/ui/button";

// Opens the browser's print dialog, where people can also "Save as PDF".
export function PrintButton() {
  return (
    <Button type="button" variant="outline" onClick={() => window.print()}>
      Print or save as PDF
    </Button>
  );
}
