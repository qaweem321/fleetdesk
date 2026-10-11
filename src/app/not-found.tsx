import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { isStaff } from "@/lib/permissions";
import { getOptionalUser } from "@/lib/session";

export const metadata: Metadata = { title: "Page not found" };

export default async function NotFound() {
  const user = await getOptionalUser();
  // The same words as the site header: staff have an admin area, customers their bookings.
  const home = user
    ? isStaff(user.role)
      ? { href: "/admin", label: "Go to admin" }
      : { href: "/account", label: "My bookings" }
    : { href: "/login", label: "Log in" };

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md space-y-4 text-center">
        <p className="text-sm font-semibold text-link">404</p>
        <h1 className="text-2xl font-bold">Page not found</h1>
        <p className="text-muted-foreground">
          This page doesn&apos;t exist, or you don&apos;t have access to it.
        </p>
        <div className="flex justify-center gap-3">
          <ButtonLink href={home.href}>{home.label}</ButtonLink>
          <ButtonLink href="/" variant="outline">
            Home
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
