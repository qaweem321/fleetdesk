"use client";

import "./globals.css";
import { ErrorMessage } from "@/components/error-message";

// Shown when even the root layout fails (error.tsx can't catch that). It replaces the whole
// page, so it brings its own <html>, <body> and styles.
export default function GlobalError(props: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <title>Something went wrong</title>
        <main className="min-h-screen flex items-center justify-center px-6">
          <ErrorMessage {...props} />
        </main>
      </body>
    </html>
  );
}
