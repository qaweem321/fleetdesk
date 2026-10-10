import Link from "next/link";
import { ActionForm, ActionMessage } from "@/components/ui/action-form";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDate } from "@/lib/format";
import type { listOpenTasks } from "@/lib/maintenance/queries";
import type { Urgency } from "@/lib/maintenance/rules";
import { completeTask, deleteTask } from "./actions";

const urgencyBadges: Record<Urgency, { label: string; tone: BadgeTone }> = {
  overdue: { label: "Overdue", tone: "danger" },
  due_soon: { label: "Due soon", tone: "warning" },
  later: { label: "Planned", tone: "neutral" },
};

const showDate = (key: string) => formatDate(new Date(`${key}T12:00:00Z`));

type Props = {
  tasks: Awaited<ReturnType<typeof listOpenTasks>>;
  distanceUnit: string;
  // On the fleet-wide page, each task shows (and links to) its car.
  showVehicle: boolean;
};

// Open maintenance tasks, each with "Mark done" (and the mileage it was done at).
export function TaskList({ tasks, distanceUnit, showVehicle }: Props) {
  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {tasks.map(({ task, plate, make, model, mileage, urgency }) => {
        const due = [
          task.dueOn && `by ${showDate(task.dueOn)}`,
          task.dueMileage !== null &&
            `at ${task.dueMileage.toLocaleString("en-US")} ${distanceUnit}`,
        ].filter(Boolean);
        return (
          <li key={task.id} className="space-y-2 p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">
                  {task.title}{" "}
                  <Badge tone={urgencyBadges[urgency].tone}>{urgencyBadges[urgency].label}</Badge>
                </p>
                <p className="text-muted-foreground">
                  {showVehicle && (
                    <>
                      <Link
                        href={`/admin/vehicles/${task.vehicleId}`}
                        className="font-mono text-link hover:underline"
                      >
                        {plate}
                      </Link>{" "}
                      ({make} {model}, {mileage.toLocaleString("en-US")} {distanceUnit}) ·{" "}
                    </>
                  )}
                  Due {due.join(" or ")}
                  {due.length > 1 && ", whichever comes first"}
                  {(task.repeatMonths || task.repeatDistance) &&
                    ` · repeats every ${[task.repeatMonths && `${task.repeatMonths} months`, task.repeatDistance && `${task.repeatDistance.toLocaleString("en-US")} ${distanceUnit}`].filter(Boolean).join(" or ")}`}
                </p>
                {task.notes && <p className="text-muted-foreground">{task.notes}</p>}
              </div>
              <form action={deleteTask}>
                <input type="hidden" name="id" value={task.id} />
                <SubmitButton
                  variant="danger-link"
                  size="inline"
                  pendingText="Deleting..."
                  confirm={`Delete "${task.title}"?`}
                >
                  Delete
                </SubmitButton>
              </form>
            </div>
            <ActionForm
              action={completeTask.bind(null, task.id)}
              className="flex flex-wrap items-center gap-2"
            >
              <Input
                name="mileage"
                type="number"
                min={0}
                defaultValue={mileage}
                aria-label={`Mileage when ${task.title} was done`}
                className="w-36"
              />
              <SubmitButton variant="outline" pendingText="Saving...">
                Mark done
              </SubmitButton>
              <ActionMessage />
            </ActionForm>
          </li>
        );
      })}
    </ul>
  );
}
