"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";

export type NavItem = { label: string; href: string };

type NavProps = {
  brand: { name: string; logoUrl: string | null };
  // The admin home. The logo links here (inside the app it never leaves the app).
  homeHref: string;
  items: NavItem[];
  // Shown at the bottom of the sidebar, e.g. a link to the public website.
  footer?: { label: string; href: string };
  onNavigate?: () => void;
};

function NavContent({ brand, homeHref, items, footer, onNavigate }: NavProps) {
  const pathname = usePathname();

  return (
    <>
      <Logo
        name={brand.name}
        logoUrl={brand.logoUrl}
        href={homeHref}
        onClick={onNavigate}
        className="block px-2 mb-8"
      />

      <nav className="flex flex-col gap-1">
        {items.map((item) => {
          const active =
            item.href === homeHref ? pathname === homeHref : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`px-2 py-2 rounded-md text-sm ${
                active
                  ? "bg-accent font-medium text-foreground"
                  : "text-secondary-foreground hover:bg-accent"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {footer && (
        <div className="mt-auto pt-6">
          <Link
            href={footer.href}
            onClick={onNavigate}
            className="block px-2 py-1.5 text-sm text-link hover:underline"
          >
            {footer.label}
          </Link>
        </div>
      )}
    </>
  );
}

export function DesktopSidebar(props: NavProps) {
  return (
    <aside className="w-60 shrink-0 border-r border-border bg-surface p-4 hidden md:flex md:flex-col">
      <NavContent {...props} />
    </aside>
  );
}

export function MobileMenu(props: NavProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="-ml-2 p-2 text-muted-foreground hover:text-foreground"
      >
        <svg
          aria-hidden="true"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default bg-black/40"
          />
          <div className="absolute inset-y-0 left-0 w-64 bg-surface p-4 flex flex-col shadow-xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-3 p-2 text-subtle-foreground hover:text-foreground"
            >
              <svg
                aria-hidden="true"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
            <NavContent {...props} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
