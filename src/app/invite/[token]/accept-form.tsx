"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { acceptInvitation } from "./actions";

export function AcceptForm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState(acceptInvitation, {});

  return (
    <form action={formAction}>
      <input type="hidden" name="token" value={token} />
      <Button disabled={isPending}>{isPending ? "Joining..." : "Accept invitation"}</Button>
      {state.error && <p className="mt-3 text-sm text-danger">{state.error}</p>}
    </form>
  );
}
