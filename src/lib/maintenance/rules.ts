import { parseWholeNumber, type Read } from "@/lib/form-input";
import { parseDateKey } from "@/lib/time-zone";

// Maintenance rules (pure, shared by the pages, the daily job and the tests). Dates are
// calendar dates at the business ("2026-12-01").

export const DUE_SOON_DAYS = 14;
export const DUE_SOON_DISTANCE = 500;

export type TaskDue = { dueOn: string | null; dueMileage: number | null };
export type Urgency = "overdue" | "due_soon" | "later";

function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

// Whichever comes first: the date or the mileage.
export function taskUrgency(task: TaskDue, vehicleMileage: number, today: string): Urgency {
  const daysLeft = task.dueOn ? daysBetween(today, task.dueOn) : null;
  const distanceLeft = task.dueMileage !== null ? task.dueMileage - vehicleMileage : null;
  if ((daysLeft !== null && daysLeft < 0) || (distanceLeft !== null && distanceLeft <= 0)) {
    return "overdue";
  }
  if (
    (daysLeft !== null && daysLeft <= DUE_SOON_DAYS) ||
    (distanceLeft !== null && distanceLeft <= DUE_SOON_DISTANCE)
  ) {
    return "due_soon";
  }
  return "later";
}

// "2026-12-31" plus 6 months -> "2027-06-30" (the last day of a shorter month).
export function addMonths(dateKey: string, months: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

type Repeating = { repeatMonths: number | null; repeatDistance: number | null };

// The next task after one is done, counted from when it was really done. Null if it doesn't
// repeat.
export function nextTaskDue(task: Repeating, doneOn: string, doneMileage: number): TaskDue | null {
  if (!task.repeatMonths && !task.repeatDistance) {
    return null;
  }
  return {
    dueOn: task.repeatMonths ? addMonths(doneOn, task.repeatMonths) : null,
    dueMileage: task.repeatDistance ? doneMileage + task.repeatDistance : null,
  };
}

export type TaskInput = TaskDue &
  Repeating & {
    title: string;
    notes: string | null;
  };

export function parseTaskInput(read: Read): { values: TaskInput } | { error: string } {
  const title = read("title");
  const dueOnText = read("dueOn");
  const dueOn = dueOnText ? parseDateKey(dueOnText) : null;
  const optionalNumber = (name: string, max: number) => {
    const text = read(name);
    return text ? parseWholeNumber(text, 1, max) : null;
  };
  const dueMileage = optionalNumber("dueMileage", 9_999_999);
  const repeatMonths = optionalNumber("repeatMonths", 120);
  const repeatDistance = optionalNumber("repeatDistance", 1_000_000);
  const notes = read("notes");
  if (!title || title.length > 80) {
    return { error: 'Please name the task, like "Oil change" (80 characters at most).' };
  }
  if (dueOnText && !dueOn) {
    return { error: "Please choose a real date, or leave it empty." };
  }
  if (
    (read("dueMileage") && dueMileage === null) ||
    (read("repeatMonths") && repeatMonths === null) ||
    (read("repeatDistance") && repeatDistance === null)
  ) {
    return { error: "Mileage and repeat values must be whole numbers, or empty." };
  }
  if (!dueOn && dueMileage === null) {
    return { error: "Please enter when it's due: a date, a mileage, or both." };
  }
  if (notes.length > 500) {
    return { error: "Notes can be at most 500 characters." };
  }
  return {
    values: { title, dueOn, dueMileage, repeatMonths, repeatDistance, notes: notes || null },
  };
}
