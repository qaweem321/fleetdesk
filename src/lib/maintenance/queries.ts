import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { carModels, maintenanceTasks, vehicles } from "@/db/schema";
import { taskUrgency, type Urgency } from "./rules";

const ORDER: Record<Urgency, number> = { overdue: 0, due_soon: 1, later: 2 };

// Open maintenance tasks with their vehicle, most urgent first. With a vehicle id: only its tasks.
export async function listOpenTasks(today: string, vehicleId?: string) {
  const rows = await db
    .select({
      task: maintenanceTasks,
      plate: vehicles.plate,
      mileage: vehicles.mileage,
      make: carModels.make,
      model: carModels.model,
    })
    .from(maintenanceTasks)
    .innerJoin(vehicles, eq(maintenanceTasks.vehicleId, vehicles.id))
    .innerJoin(carModels, eq(vehicles.carModelId, carModels.id))
    .where(
      and(
        isNull(maintenanceTasks.completedAt),
        vehicleId ? eq(maintenanceTasks.vehicleId, vehicleId) : undefined,
      ),
    );
  return rows
    .map((row) => ({ ...row, urgency: taskUrgency(row.task, row.mileage, today) }))
    .sort(
      (a, b) =>
        ORDER[a.urgency] - ORDER[b.urgency] ||
        (a.task.dueOn ?? "9").localeCompare(b.task.dueOn ?? "9"),
    );
}
