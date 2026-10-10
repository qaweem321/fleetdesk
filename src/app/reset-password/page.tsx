import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Reset password" };

type Props = {
  searchParams: Promise<{ token?: string; error?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token, error } = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Choose a new password</h1>

        {token && !error ? (
          <ResetPasswordForm token={token} />
        ) : (
          <>
            <p className="text-muted-foreground">This reset link is invalid or has expired.</p>
            <Link href="/forgot-password" className="block text-sm text-link hover:underline">
              Request a new link
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
