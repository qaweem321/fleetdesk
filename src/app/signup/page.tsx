"use client";

import Link from "next/link";
import { useState } from "react";
import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { getNextPath } from "@/lib/safe-redirect";

export default function SignUpPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const { data, error } = await authClient.signUp.email({
      name: String(form.get("name")),
      email,
      password: String(form.get("password")),
      callbackURL: getNextPath(),
    });

    setLoading(false);
    if (error) {
      setError(error.message ?? "Something went wrong");
      return;
    }
    // A session token means no verification is needed (demo mode): go straight in.
    if (data?.token) {
      window.location.replace(getNextPath());
      return;
    }
    setSentTo(email);
  }

  if (sentTo) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-4">
          <h1 className="text-2xl font-bold">Check your email</h1>
          <p className="text-muted-foreground">
            We sent a verification link to <strong className="text-foreground">{sentTo}</strong>.
            Click it to finish creating your account. Don&apos;t forget to check your spam folder.
          </p>
          <p className="text-sm text-muted-foreground">
            Already verified?{" "}
            <Link href="/login" className="text-link hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <form method="post" onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Create your account</h1>

        <Input name="name" required placeholder="Full name" autoComplete="name" />
        <Input name="email" type="email" required placeholder="Email" autoComplete="email" />
        <PasswordInput
          name="password"
          minLength={8}
          autoComplete="new-password"
          placeholder="Password (8+ characters)"
        />

        {error && <p className="text-sm text-danger">{error}</p>}

        <p className="text-xs text-subtle-foreground">
          By signing up, you agree to our{" "}
          <Link href="/terms" className="text-link hover:underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-link hover:underline">
            Privacy Policy
          </Link>
          .
        </p>

        <Button disabled={loading} size="full">
          {loading ? "Creating account..." : "Sign up"}
        </Button>

        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-link hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </main>
  );
}
