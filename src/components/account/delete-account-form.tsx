"use client";

import { useState } from "react";
import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function DeleteAccountForm() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!window.confirm("Delete your account? This cannot be undone.")) {
      return;
    }
    setError("");
    setLoading(true);

    const password = String(new FormData(event.currentTarget).get("password"));
    const { error } = await authClient.deleteUser({ password });

    if (error) {
      setLoading(false);
      setError(
        error.code === "INVALID_PASSWORD"
          ? "That password is incorrect."
          : (error.message ?? "Could not delete your account."),
      );
      return;
    }
    window.location.replace("/");
  }

  return (
    <form method="post" onSubmit={handleSubmit} className="space-y-3">
      <PasswordInput
        name="password"
        autoComplete="current-password"
        placeholder="Your password, to confirm"
      />
      <Button disabled={loading} variant="danger">
        {loading ? "Deleting..." : "Delete my account"}
      </Button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}
