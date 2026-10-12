"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { safeNextPath } from "@/lib/safe-redirect";

// The "Log in" / "Sign up" links between the two pages keep where the person was going (for
// example an invitation), so switching pages doesn't lose it.
export function AuthSwitchLink({ href, children }: { href: string; children: ReactNode }) {
  const next = useSearchParams().get("next");
  const target = next ? `${href}?next=${encodeURIComponent(safeNextPath(next))}` : href;
  return (
    <Link href={target} className="text-link hover:underline">
      {children}
    </Link>
  );
}
