"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { completeSetup, type SetupState } from "./actions";

// The business fields are rendered on the server (long lists of currencies and time zones)
// and passed in as children.
export function SetupForm({ children }: { children: React.ReactNode }) {
  const [state, formAction] = useActionState(completeSetup, {} as SetupState);

  return (
    <form action={formAction} className="space-y-4">
      {children}
      <FormMessage error={state.error} />
      <SubmitButton size="full" pendingText="Setting up...">
        Finish setup
      </SubmitButton>
    </form>
  );
}
