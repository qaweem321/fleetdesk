"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const form = new FormData(event.currentTarget);
    await authClient.requestPasswordReset({
      email: String(form.get("email")),
      redirectTo: "/reset-password",
    });

    setLoading(false);
    setSent(true);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Forgot your password?</h1>

        {sent ? (
          <p className="text-muted-foreground">
            If an account exists for that email, we&apos;ve sent a link to reset your password.
            Check your inbox and spam folder.
          </p>
        ) : (
          <form method="post" onSubmit={handleSubmit} className="space-y-4">
            <p className="text-muted-foreground">
              Enter your email and we&apos;ll send you a reset link.
            </p>
            <Input name="email" type="email" required placeholder="Email" autoComplete="email" />
            <Button disabled={loading} size="full">
              {loading ? "Sending..." : "Send reset link"}
            </Button>
          </form>
        )}

        <Link href="/login" className="block text-sm text-link hover:underline">
          Back to log in
        </Link>
      </div>
    </main>
  );
}
