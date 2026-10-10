import type { Metadata } from "next";
import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { listOpenTasks } from "@/lib/maintenance/queries";
import { requireStaff } from "@/lib/session";
import { requireSettings } from "@/lib/settings";
import { localDateKey } from "@/lib/time-zone";
import { TaskList } from "./task-list";

export const metadata: Metadata = { title: "Maintenance" };

export default async function MaintenancePage() {
  const [, settings] = await Promise.all([requireStaff(), requireSettings()]);
  const tasks = await listOpenTasks(localDateKey(new Date(), settings.timeZone));

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Maintenance"
        description="Every planned service, most urgent first. Add tasks on each vehicle's page."
      />
      {tasks.length === 0 ? (
        <EmptyState title="Nothing planned">
          Open a vehicle and add its oil changes, tire changes and inspections.
        </EmptyState>
      ) : (
        <TaskList tasks={tasks} distanceUnit={settings.distanceUnit} showVehicle />
      )}
    </div>
  );
}
