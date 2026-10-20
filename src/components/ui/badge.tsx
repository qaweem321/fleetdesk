import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// The text mixes the tone with the page's text color (darker in light mode, lighter in dark mode),
// so small badge text stays readable on its tinted background. "info" uses the fixed link color,
// not the brand color, which the owner can set to anything.
const tones = {
  neutral: "bg-muted text-secondary-foreground",
  success: "bg-success/15 text-[color-mix(in_oklab,var(--success)_65%,var(--foreground))]",
  warning: "bg-warning/15 text-[color-mix(in_oklab,var(--warning)_65%,var(--foreground))]",
  danger: "bg-danger/15 text-[color-mix(in_oklab,var(--danger)_65%,var(--foreground))]",
  info: "bg-link/15 text-[color-mix(in_oklab,var(--link)_65%,var(--foreground))]",
};

export type BadgeTone = keyof typeof tones;

// A small rounded label for a status: "Available", "Hidden", "Overdue"...
export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
