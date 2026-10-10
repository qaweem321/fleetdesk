import { ActionForm, ActionMessage } from "@/components/ui/action-form";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/action-state";

type Props = { action: (previous: ActionState, formData: FormData) => Promise<ActionState> };

export function BlockForm({ action }: Props) {
  return (
    <ActionForm action={action} resetOnSuccess className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="From" htmlFor="startsAt">
          <Input id="startsAt" name="startsAt" type="datetime-local" required />
        </Field>
        <Field label="Until" htmlFor="endsAt">
          <Input id="endsAt" name="endsAt" type="datetime-local" required />
        </Field>
      </div>
      <Field label="Reason" htmlFor="reason">
        <Input id="reason" name="reason" required maxLength={200} placeholder="Annual service" />
      </Field>
      <ActionMessage />
      <SubmitButton variant="outline" pendingText="Saving...">
        Block these dates
      </SubmitButton>
    </ActionForm>
  );
}
