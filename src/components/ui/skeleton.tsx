import { cn } from "@/lib/cn";

// A grey pulsing block that stands in for content while it loads.
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-md bg-muted", className)} />;
}
