"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

// Shared by the log out button and the user menu.
export function useSignOut() {
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    await authClient.signOut();
    // A full page load throws away saved dashboard pages, so the back button can't show them.
    window.location.replace("/login");
  }

  return { signOut, loading };
}

export function SignOutButton() {
  const { signOut, loading } = useSignOut();

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-medium text-secondary-foreground transition duration-150 hover:border-input-hover hover:bg-muted hover:text-foreground active:scale-95 active:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="M16 17l5-5-5-5" />
        <path d="M21 12H9" />
      </svg>
      {loading ? "Logging out..." : "Log out"}
    </button>
  );
}
