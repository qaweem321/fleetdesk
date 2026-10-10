"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { atomic } from "@/db/atomic";
import { maintenanceTasks, vehicles } from "@/db/schema";
import type { ActionState } from "@/lib/action-state";
import { formReader, parseWholeNumber } from "@/lib/form-input";
import { nextTaskDue, parseTaskInput } from "@/lib/maintenance/rules";
import { requireStaff } from "@/lib/session";
import { requireSettings } from "@/lib/settings";
import { localDateKey } from "@/lib/time-zone";
import { isUuid } from "@/lib/uuid";

function refresh(vehicleId: string) {
  revalidatePath(`/admin/vehicles/${vehicleId}`);
  revalidatePath("/admin/maintenance");
  revalidatePath("/admin");
}

export async function addTask(
  vehicleId: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireStaff();
  if (!isUuid(vehicleId)) {
    throw new Error("Vehicle not found.");
  }
  const parsed = parseTaskInput(formReader(formData));
  if ("error" in parsed) {
    return parsed;
  }
  await db.insert(maintenanceTasks).values({ vehicleId, ...parsed.values });
  refresh(vehicleId);
  return { success: `${parsed.values.title} added.` };
}

// Marks a task done at the vehicle's current mileage (or the one typed) and plans the next one
// when it repeats. The vehicle's mileage is updated if the typed one is higher.
export async function completeTask(
  taskId: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const [staff, settings] = await Promise.all([requireStaff(), requireSettings()]);
  const [found] = isUuid(taskId)
    ? await db
        .select({ task: maintenanceTasks, mileage: vehicles.mileage })
        .from(maintenanceTasks)
        .innerJoin(vehicles, eq(vehicles.id, maintenanceTasks.vehicleId))
        .where(and(eq(maintenanceTasks.id, taskId), isNull(maintenanceTasks.completedAt)))
    : [];
  if (!found) {
    return { error: "This task is already done." };
  }
  const mileage = parseWholeNumber(
    String(formData.get("mileage") ?? "").trim() || String(found.mileage),
    0,
    9_999_999,
  );
  if (mileage === null) {
    return { error: "Please enter the mileage as a whole number." };
  }
  const now = new Date();
  const next = nextTaskDue(found.task, localDateKey(now, settings.timeZone), mileage);
  const { task } = found;
  await atomic((tx) => [
    tx
      .update(maintenanceTasks)
      .set({ completedAt: now, completedMileage: mileage, completedById: staff.id })
      .where(eq(maintenanceTasks.id, task.id)),
    ...(mileage > found.mileage
      ? [tx.update(vehicles).set({ mileage }).where(eq(vehicles.id, task.vehicleId))]
      : []),
    ...(next
      ? [
          tx.insert(maintenanceTasks).values({
            vehicleId: task.vehicleId,
            title: task.title,
            notes: task.notes,
            repeatMonths: task.repeatMonths,
            repeatDistance: task.repeatDistance,
            ...next,
          }),
        ]
      : []),
  ]);
  refresh(task.vehicleId);
  return { success: next ? `${task.title} done. The next one is planned.` : `${task.title} done.` };
}

export async function deleteTask(formData: FormData) {
  await requireStaff();
  const id = String(formData.get("id"));
  if (!isUuid(id)) {
    throw new Error("Task not found.");
  }
  const [deleted] = await db
    .delete(maintenanceTasks)
    .where(eq(maintenanceTasks.id, id))
    .returning({ vehicleId: maintenanceTasks.vehicleId });
  if (deleted) {
    refresh(deleted.vehicleId);
  }
}
