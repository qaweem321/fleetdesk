"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/components/sidebar-nav";

type Props = {
  items: NavItem[];
  // For tabs that are filters on one page (?show=...): the page says which tab is active.
  activeHref?: string;
};

// The tab whose page we're on, or a page inside it ("/account/bookings/123" belongs to
// "/account"). When several match, the longest (most specific) wins.
function matchingHref(items: NavItem[], pathname: string) {
  return items
    .map((item) => item.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
}

// A row of tabs that link to pages, e.g. "My bookings · Account".
export function Tabs({ items, activeHref }: Props) {
  const pathname = usePathname();
  const active = activeHref ?? matchingHref(items, pathname);

  return (
    <nav aria-label="Sections" className="flex gap-1 overflow-x-auto border-b border-border">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.href === active ? "page" : undefined}
          className={`shrink-0 border-b-2 px-3 py-2 text-sm ${
            item.href === active
              ? "border-primary font-medium text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
