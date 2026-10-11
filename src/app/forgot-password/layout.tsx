import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { AuthFrame } from "@/components/site/auth-frame";
import { isDemoMode } from "@/lib/demo";
import { redirectIfLoggedIn } from "@/lib/session";

export const metadata: Metadata = { title: "Forgot password" };

export default async function Layout({ children }: { children: ReactNode }) {
  await redirectIfLoggedIn();
  // The demo sends no emails, so a reset link would never arrive.
  if (isDemoMode()) {
    return (
      <AuthFrame>
        <main className="min-h-screen flex items-center justify-center px-6">
          <div className="w-full max-w-sm space-y-4">
            <h1 className="text-2xl font-bold">Forgot your password?</h1>
            <p className="text-muted-foreground">
              Emails are turned off in this demo, so passwords can&apos;t be reset. Log in with one
              of the sample logins shown at the top of the page.
            </p>
            <Link href="/login" className="block text-sm text-link hover:underline">
              Back to log in
            </Link>
          </div>
        </main>
      </AuthFrame>
    );
  }
  return <AuthFrame>{children}</AuthFrame>;
}
