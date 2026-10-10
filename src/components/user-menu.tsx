"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSignOut } from "@/components/sign-out-button";

type Props = { name: string; email: string; accountHref: string };

const itemClasses =
  "block w-full px-3 py-2 text-left text-sm text-secondary-foreground hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:outline-none disabled:opacity-60";

// The avatar in the top right. Click it for personal things: account settings and log out.
export function UserMenu({ name, email, accountHref }: Props) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { signOut, loading } = useSignOut();

  // Close when clicking outside the menu or pressing Escape.
  useEffect(() => {
    if (!open) {
      return;
    }
    function closeOnOutsideClick(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Open user menu"
        aria-expanded={open}
        className="h-8 w-8 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {name.charAt(0).toUpperCase()}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-30 w-60 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
          <div className="border-b border-border px-3 py-2">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="truncate text-xs text-subtle-foreground">{email}</p>
          </div>
          <Link href={accountHref} onClick={() => setOpen(false)} className={itemClasses}>
            Account settings
          </Link>
          <button type="button" onClick={signOut} disabled={loading} className={itemClasses}>
            {loading ? "Logging out..." : "Log out"}
          </button>
        </div>
      )}
    </div>
  );
}
