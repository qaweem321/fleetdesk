import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50";

const variants = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  outline: "border border-input hover:bg-surface",
  danger: "bg-red-600 text-white hover:bg-red-700",
  "danger-outline": "border border-danger/60 text-danger hover:bg-danger/10",
  // Text-only buttons for small row actions like "Save" or "Remove".
  link: "text-link hover:underline",
  "danger-link": "text-danger hover:underline",
};

const sizes = {
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3",
  full: "w-full px-4 py-2",
  // No padding, for the text-only variants.
  inline: "text-sm",
};

export type ButtonStyle = {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  className?: string;
};

// For elements that should look like a button but aren't <button>, e.g. <a href="#section">.
export function buttonClasses({ variant = "primary", size = "md", className }: ButtonStyle = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant,
  size,
  className,
  ...props
}: ComponentProps<"button"> & ButtonStyle) {
  return <button className={buttonClasses({ variant, size, className })} {...props} />;
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & ButtonStyle) {
  return <Link className={buttonClasses({ variant, size, className })} {...props} />;
}
