"use client";

import { type ReactNode, useActionState } from "react";
import { FormMessage } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { type SettingsState, updateSettings } from "./actions";

// The fields are rendered on the server (long lists of currencies and time zones) and passed
// in as children.
export function SettingsForm({ children }: { children: ReactNode }) {
  const [state, formAction] = useActionState(updateSettings, {} as SettingsState);

  return (
    <form action={formAction} className="space-y-5">
      {children}
      <FormMessage error={state.error} success={state.success} />
      <SubmitButton pendingText="Saving...">Save settings</SubmitButton>
    </form>
  );
}
