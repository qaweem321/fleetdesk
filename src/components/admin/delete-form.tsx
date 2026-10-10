import { ActionForm, ActionMessage } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/action-state";

type Props = {
  action: (previous: ActionState, formData: FormData) => Promise<ActionState>;
  // Sent with the form, e.g. { id: "..." }.
  fields: Record<string, string>;
  // The "Are you sure?" question.
  confirm: string;
  label: string;
  pendingText?: string;
};

// A destructive button that asks first, and shows the reason when the server says no
// (for example "Vehicles still use this location").
export function DeleteForm({ action, fields, confirm, label, pendingText = "Deleting..." }: Props) {
  return (
    <ActionForm action={action} className="space-y-2">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <SubmitButton variant="danger-outline" confirm={confirm} pendingText={pendingText}>
        {label}
      </SubmitButton>
      <ActionMessage />
    </ActionForm>
  );
}
