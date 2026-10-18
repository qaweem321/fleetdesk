"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { roleLabels, type StaffRole } from "@/lib/permissions";
import { type InviteState, inviteStaff } from "./actions";

export function InviteForm({ roles }: { roles: StaffRole[] }) {
  const [state, formAction] = useActionState(inviteStaff, {} as InviteState);

  return (
    <form action={formAction} className="mt-6 space-y-2">
      <div className="flex flex-wrap gap-2">
        <Input
          name="email"
          type="email"
          required
          defaultValue={state.email}
          placeholder="teammate@yourbusiness.com"
          aria-label="Email address to invite"
          className="flex-1 min-w-56"
        />
        <Select name="role" defaultValue="agent" aria-label="Role">
          {roles.map((role) => (
            <option key={role} value={role}>
              {roleLabels[role]}
            </option>
          ))}
        </Select>
        <SubmitButton pendingText="Sending...">Invite</SubmitButton>
      </div>
      <FormMessage error={state.error} success={state.success} />
    </form>
  );
}
