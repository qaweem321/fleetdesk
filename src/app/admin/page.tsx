import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/admin/page-header";
import { countLicensesToReview } from "@/lib/drivers/queries";
import { formatTime } from "@/lib/format";
import { listOpenTasks } from "@/lib/maintenance/queries";
import { formatMoney } from "@/lib/money";
import { can } from "@/lib/permissions";
import { resolvePeriod, today } from "@/lib/reports/period";
import { counterToday, fleetCounts, revenue } from "@/lib/reports/queries";
import { requireStaff } from "@/lib/session";
import { requireSettings } from "@/lib/settings";
import { localDateKey } from "@/lib/time-zone";
import { GetStarted } from "./get-started";

export const metadata: Metadata = { title: "Overview" };

function Tile({ label, value, href }: { label: string; value: ReactNode; href?: string }) {
  const body = (
    <>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </>
  );
  return href ? (
    <Link href={href} className="rounded-xl border border-border p-4 hover:bg-muted">
      {body}
    </Link>
  ) : (
    <div className="rounded-xl border border-border p-4">{body}</div>
  );
}

type Row = Awaited<ReturnType<typeof counterToday>>["pickups"][number];

function BookingList({
  rows,
  empty,
  time,
  timeZone,
}: {
  rows: Row[];
  empty: string;
  time: (row: Row) => Date;
  timeZone: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <ul className="divide-y divide-border text-sm">
      {rows.map((row) => (
        <li key={row.id}>
          <Link
            href={`/admin/bookings/${row.id}`}
            className="flex flex-wrap items-center justify-between gap-2 py-2 hover:underline"
          >
            <span>
              <span className="font-medium tabular-nums">{formatTime(time(row), timeZone)}</span> ·{" "}
              {row.customerName} · {row.make} {row.model}{" "}
              <span className="font-mono text-subtle-foreground">{row.plate}</span>
            </span>
            <span className="text-muted-foreground">{row.placeName}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function AdminOverviewPage() {
  const [user, settings] = await Promise.all([requireStaff(), requireSettings()]);
  const tz = settings.timeZone;
  const showMoney = can(user.role, "reports:view");
  const [counter, fleet, licenses, tasks, income] = await Promise.all([
    counterToday(today(tz)),
    fleetCounts(),
    countLicensesToReview(),
    listOpenTasks(localDateKey(new Date(), tz)),
    showMoney ? revenue(resolvePeriod("30d", tz)) : Promise.resolve(null),
  ]);
  const urgentTasks = tasks.filter((task) => task.urgency !== "later");
  const overdueTasks = urgentTasks.filter((task) => task.urgency === "overdue").length;

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {user.name}</h1>
        <p className="mt-1 text-muted-foreground">
          Here&apos;s what&apos;s happening at {settings.businessName} today.
        </p>
      </div>

      {can(user.role, "fleet:manage") && <GetStarted />}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Tile label="Out with customers" value={fleet.out} href="/admin/bookings?show=out" />
        <Tile
          label="Free to rent now"
          value={Math.max(0, fleet.total - fleet.out - fleet.maintenance)}
          href="/admin/vehicles?status=available"
        />
        <Tile
          label="In maintenance"
          value={fleet.maintenance}
          href="/admin/vehicles?status=maintenance"
        />
        {income !== null ? (
          <Tile
            label="Income, last 30 days"
            value={formatMoney(income, settings.currency)}
            href="/admin/reports"
          />
        ) : (
          <Tile label="Licenses to check" value={licenses} href="/admin/customers" />
        )}
      </div>

      {(counter.late.length > 0 || licenses > 0 || urgentTasks.length > 0) && (
        <Card title="Needs attention">
          <ul className="space-y-2 text-sm">
            {counter.late.length > 0 && (
              <li className="text-danger">
                {counter.late.length} {counter.late.length === 1 ? "car is" : "cars are"} late back:{" "}
                {counter.late.map((row, index) => (
                  <span key={row.id}>
                    {index > 0 && ", "}
                    <Link href={`/admin/bookings/${row.id}`} className="underline">
                      {row.plate} ({row.customerName}, {row.customerPhone})
                    </Link>
                  </span>
                ))}
              </li>
            )}
            {licenses > 0 && (
              <li>
                <Link href="/admin/customers" className="text-link hover:underline">
                  {licenses} driver&apos;s {licenses === 1 ? "license" : "licenses"} to check
                </Link>
              </li>
            )}
            {urgentTasks.length > 0 && (
              <li>
                <Link href="/admin/maintenance" className="text-link hover:underline">
                  {urgentTasks.length} {urgentTasks.length === 1 ? "service" : "services"} due soon
                  {overdueTasks > 0 && ` (${overdueTasks} overdue)`}
                </Link>
              </li>
            )}
          </ul>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={`Pickups today (${counter.pickups.length})`}>
          <BookingList
            rows={counter.pickups}
            empty="No pickups today."
            time={(row) => row.pickupAt}
            timeZone={tz}
          />
        </Card>
        <Card title={`Returns still due today (${counter.returns.length})`}>
          <BookingList
            rows={counter.returns}
            empty="No more returns today."
            time={(row) => row.returnAt}
            timeZone={tz}
          />
        </Card>
      </div>
    </div>
  );
}
