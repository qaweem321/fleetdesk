import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DesktopSidebar, MobileMenu } from "@/components/sidebar-nav";
import { UserMenu } from "@/components/user-menu";
import { adminNavFor } from "@/lib/admin-nav";
import { requireStaff } from "@/lib/session";
import { requireSettings } from "@/lib/settings";
import { fileUrl } from "@/lib/storage";

export const metadata: Metadata = { robots: { index: false } };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const [user, settings] = await Promise.all([requireStaff(), requireSettings()]);
  const nav = {
    brand: {
      name: settings.businessName,
      logoUrl: settings.logoFileId ? fileUrl(settings.logoFileId) : null,
    },
    homeHref: "/admin",
    items: adminNavFor(user.role),
    footer: { label: "View website", href: "/" },
  };

  return (
    <div className="min-h-screen flex">
      <DesktopSidebar {...nav} />

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 border-b border-border px-4 md:px-6 flex items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <MobileMenu {...nav} />
            <span className="truncate text-sm font-medium text-subtle-foreground">
              {settings.businessName}
            </span>
          </div>
          <UserMenu name={user.name} email={user.email} accountHref="/admin/account" />
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
