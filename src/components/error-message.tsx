"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";

type Props = {
  error: Error & { digest?: string };
  retry: () => void;
};

export function ErrorMessage({ error, retry }: Props) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="text-muted-foreground">
        Sorry, we couldn&apos;t complete that. Please try again. If it keeps happening, contact
        support
        {error.digest ? (
          <>
            {" "}
            and mention code <code className="rounded bg-muted px-1">{error.digest}</code>
          </>
        ) : null}
        .
      </p>
      <div className="flex gap-3">
        <Button onClick={() => retry()}>Try again</Button>
        <ButtonLink href="/dashboard" variant="outline">
          Go to dashboard
        </ButtonLink>
      </div>
    </div>
  );
}
