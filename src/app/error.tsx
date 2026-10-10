"use client";

import { ErrorMessage } from "@/components/error-message";

export default function RootError(props: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <ErrorMessage {...props} />
    </main>
  );
}
