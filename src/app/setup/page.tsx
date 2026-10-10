import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { BusinessFields } from "@/components/business-fields";
import { ButtonLink } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getOptionalUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { SetupForm } from "./setup-form";

export const metadata: Metadata = { title: "Set up", robots: { index: false } };

// The setup wizard. It runs once, right after installing: the first account becomes the owner
// and names the business. Afterwards this page just sends people home.
export default async function SetupPage() {
  const [settings, user] = await Promise.all([getSettings(), getOptionalUser()]);
  if (settings) {
    redirect("/");
  }

  if (!user) {
    return (
      <Card title={`Welcome to ${siteConfig.name}`}>
        <Steps current={1} />
        <p className="text-muted-foreground">
          First, create the owner account. You&apos;ll use it to run the business: cars, prices,
          bookings and staff.
        </p>
        <div className="flex gap-3">
          <ButtonLink href="/signup?next=/setup">Create owner account</ButtonLink>
          <ButtonLink href="/login?next=/setup" variant="outline">
            Log in
          </ButtonLink>
        </div>
      </Card>
    );
  }

  const [otherOwner] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "owner"))
    .limit(1);
  if (otherOwner && otherOwner.id !== user.id) {
    return (
      <Card title="Setup is already being done">
        <p className="text-muted-foreground">
          Someone else is the owner of this site. Ask them to finish setup or to invite you.
        </p>
      </Card>
    );
  }

  return (
    <Card title="Tell us about your business">
      <Steps current={2} />
      <p className="text-muted-foreground">
        Hi {user.name}! You can change all of this later under Settings.
      </p>
      <SetupForm>
        <BusinessFields values={{ contactEmail: user.email }} />
      </SetupForm>
    </Card>
  );
}

function Steps({ current }: { current: 1 | 2 }) {
  return (
    <p className="text-sm font-medium text-subtle-foreground">
      Step {current} of 2 · {current === 1 ? "Owner account" : "Business details"}
    </p>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg space-y-4">
        <h1 className="text-2xl font-bold">{title}</h1>
        {children}
      </div>
    </main>
  );
}
