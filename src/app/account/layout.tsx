import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SignOutButton } from "@/components/sign-out-button";
import { PublicPage } from "@/components/site/public-page";
import { Tabs } from "@/components/site/tabs";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { robots: { index: false } };

const tabs = [
  { label: "My bookings", href: "/account" },
  { label: "Driver details", href: "/account/driver" },
  { label: "Account", href: "/account/settings" },
];

// The customer's own area. Staff can use it too (to book a car for themselves).
export default async function AccountLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  return (
    <PublicPage>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Hi {user.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
          </div>
          <SignOutButton />
        </div>
        <div className="mt-6">
          <Tabs items={tabs} />
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </PublicPage>
  );
}
