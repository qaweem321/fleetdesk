"use client";

import { useState } from "react";
import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function PasswordForm() {
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const form = event.currentTarget;
    const data = new FormData(form);
    const newPassword = String(data.get("newPassword"));
    if (newPassword !== String(data.get("confirmPassword"))) {
      setMessage({ type: "error", text: "The two new passwords don't match." });
      return;
    }

    setLoading(true);
    const { error } = await authClient.changePassword({
      currentPassword: String(data.get("currentPassword")),
      newPassword,
      revokeOtherSessions: true,
    });
    setLoading(false);

    if (error) {
      setMessage({
        type: "error",
        text:
          error.code === "INVALID_PASSWORD"
            ? "Your current password is incorrect."
            : (error.message ?? "Could not change your password."),
      });
      return;
    }
    form.reset();
    setMessage({
      type: "success",
      text: "Password changed. You've been logged out on your other devices.",
    });
  }

  return (
    <form method="post" onSubmit={handleSubmit} className="space-y-3">
      <PasswordInput
        name="currentPassword"
        autoComplete="current-password"
        placeholder="Current password"
      />
      <PasswordInput
        name="newPassword"
        minLength={8}
        autoComplete="new-password"
        placeholder="New password (8+ characters)"
      />
      <PasswordInput
        name="confirmPassword"
        minLength={8}
        autoComplete="new-password"
        placeholder="Confirm new password"
      />
      <Button disabled={loading}>{loading ? "Saving..." : "Change password"}</Button>
      {message && (
        <p className={`text-sm ${message.type === "success" ? "text-success" : "text-danger"}`}>
          {message.text}
        </p>
      )}
    </form>
  );
}
