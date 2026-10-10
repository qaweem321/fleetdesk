import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export const inputClasses =
  "w-full rounded-lg border border-input bg-background px-3 py-2 placeholder:text-subtle-foreground focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-primary disabled:bg-muted disabled:text-subtle-foreground";

// Fields without a <label> (no id) use their placeholder as the name screen readers announce.
export function Input({ className, ...props }: ComponentProps<"input">) {
  const ariaLabel = props["aria-label"] ?? (props.id ? undefined : props.placeholder);
  return <input className={cn(inputClasses, className)} aria-label={ariaLabel} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "rounded-lg border border-input bg-background px-3 py-2 focus-visible:outline-2 focus-visible:outline-primary",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  const ariaLabel = props["aria-label"] ?? (props.id ? undefined : props.placeholder);
  return (
    <textarea
      className={cn(inputClasses, "min-h-24", className)}
      aria-label={ariaLabel}
      {...props}
    />
  );
}
