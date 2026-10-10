import { ActionForm, ActionMessage } from "@/components/ui/action-form";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/action-state";

type Props = {
  action: (previous: ActionState, formData: FormData) => Promise<ActionState>;
  distanceUnit: string;
};

export function TaskForm({ action, distanceUnit }: Props) {
  return (
    <ActionForm action={action} resetOnSuccess className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Task" htmlFor="task-title">
          <Input
            id="task-title"
            name="title"
            required
            maxLength={80}
            placeholder="Oil change"
            list="task-suggestions"
          />
          <datalist id="task-suggestions">
            <option value="Oil change" />
            <option value="Tire change" />
            <option value="Brake check" />
            <option value="Annual inspection" />
            <option value="Insurance renewal" />
          </datalist>
        </Field>
        <Field label="Due on" htmlFor="task-due-on">
          <Input id="task-due-on" name="dueOn" type="date" />
        </Field>
        <Field label={`or at (${distanceUnit})`} htmlFor="task-due-mileage">
          <Input id="task-due-mileage" name="dueMileage" type="number" min={1} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Repeat every (months)" htmlFor="task-repeat-months" hint="Optional">
          <Input id="task-repeat-months" name="repeatMonths" type="number" min={1} max={120} />
        </Field>
        <Field label={`or every (${distanceUnit})`} htmlFor="task-repeat-distance" hint="Optional">
          <Input id="task-repeat-distance" name="repeatDistance" type="number" min={1} />
        </Field>
        <Field label="Notes" htmlFor="task-notes">
          <Input id="task-notes" name="notes" maxLength={500} />
        </Field>
      </div>
      <ActionMessage />
      <SubmitButton variant="outline" pendingText="Adding...">
        Add task
      </SubmitButton>
    </ActionForm>
  );
}
