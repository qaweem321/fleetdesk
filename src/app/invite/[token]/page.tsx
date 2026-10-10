import type { Metadata } from "next";
import { headers } from "next/headers";
import { SignOutButton } from "@/components/sign-out-button";
import { ButtonLink } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { findValidInvitation } from "@/lib/invitations";
import { roleLabels } from "@/lib/permissions";
import { requireSettings } from "@/lib/settings";
import { AcceptForm } from "./accept-form";

export const metadata: Metadata = { title: "Invitation" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [invitation, session, settings] = await Promise.all([
    findValidInvitation(token),
    headers().then((requestHeaders) => auth.api.getSession({ headers: requestHeaders })),
    requireSettings(),
  ]);

  if (!invitation) {
    return (
      <Card title="Invitation not found">
        <p className="text-muted-foreground">
          This invitation link is invalid or has expired. Ask for a new one.
        </p>
      </Card>
    );
  }

  const role = roleLabels[invitation.role].toLowerCase();
  const title = `Join the ${settings.businessName} team`;
  const next = encodeURIComponent(`/invite/${token}`);

  if (!session) {
    return (
      <Card title={title}>
        <p className="text-muted-foreground">
          You were invited as <strong>{role}</strong>. Sign up or log in with{" "}
          <strong>{invitation.email}</strong> to accept.
        </p>
        <div className="flex gap-3">
          <ButtonLink href={`/signup?next=${next}`}>Sign up</ButtonLink>
          <ButtonLink href={`/login?next=${next}`} variant="outline">
            Log in
          </ButtonLink>
        </div>
      </Card>
    );
  }

  if (session.user.email.toLowerCase() !== invitation.email) {
    return (
      <Card title="Wrong account">
        <p className="text-muted-foreground">
          This invitation is for <strong>{invitation.email}</strong>, but you are logged in as{" "}
          <strong>{session.user.email}</strong>. Log out and use the invited email.
        </p>
        <SignOutButton />
      </Card>
    );
  }

  return (
    <Card title={title}>
      <p className="text-muted-foreground">
        You were invited as <strong>{role}</strong>.
      </p>
      <AcceptForm token={token} />
    </Card>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">{title}</h1>
        {children}
      </div>
    </main>
  );
}
