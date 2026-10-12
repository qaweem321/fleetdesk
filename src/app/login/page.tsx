"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthSwitchLink } from "@/components/auth-switch-link";
import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { getNextPath } from "@/lib/safe-redirect";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const { error } = await authClient.signIn.email({
      email,
      password: String(form.get("password")),
      callbackURL: getNextPath(),
    });

    setLoading(false);
    if (error) {
      setError(
        error.code === "EMAIL_NOT_VERIFIED"
          ? `Please verify your email first. We've sent a new link to ${email}.`
          : (error.message ?? "Something went wrong"),
      );
      return;
    }
    // A full page load (not an in-app jump) throws away pages saved while logged out,
    // and replace() keeps the login page out of the back-button history.
    window.location.replace(getNextPath());
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <form method="post" onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Log in</h1>

        <Input name="email" type="email" required placeholder="Email" autoComplete="email" />
        <PasswordInput name="password" autoComplete="current-password" placeholder="Password" />
        <Link
          href="/forgot-password"
          className="block text-right text-sm text-link hover:underline"
        >
          Forgot password?
        </Link>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button disabled={loading} size="full">
          {loading ? "Logging in..." : "Log in"}
        </Button>

        <p className="text-sm text-muted-foreground">
          No account yet? <AuthSwitchLink href="/signup">Sign up</AuthSwitchLink>
        </p>
      </form>
    </main>
  );
}
