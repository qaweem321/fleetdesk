import { addMonths } from "@/lib/maintenance/rules";
import { fromLocalInput, localDateKey } from "@/lib/time-zone";

// Time periods for the dashboard and reports, as UTC moments that match calendar days at the
// business (a "day" starts at midnight there, not in UTC).

export type Period = { from: Date; to: Date; label: string };
export type PeriodName = "30d" | "month" | "last_month";

export const periodNames: Record<PeriodName, string> = {
  "30d": "Last 30 days",
  month: "This month",
  last_month: "Last month",
};

function startOf(dateKey: string, timeZone: string) {
  return fromLocalInput(`${dateKey}T00:00`, timeZone) as Date;
}

function nextDay(dateKey: string) {
  return new Date(Date.parse(`${dateKey}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
}

// Today at the business: from midnight to the next midnight.
export function today(timeZone: string, now = new Date()): Period {
  const key = localDateKey(now, timeZone);
  return { from: startOf(key, timeZone), to: startOf(nextDay(key), timeZone), label: "Today" };
}

export function resolvePeriod(name: PeriodName, timeZone: string, now = new Date()): Period {
  const todayKey = localDateKey(now, timeZone);
  const monthStart = `${todayKey.slice(0, 8)}01`;
  if (name === "month") {
    return { from: startOf(monthStart, timeZone), to: now, label: periodNames.month };
  }
  if (name === "last_month") {
    return {
      from: startOf(addMonths(monthStart, -1), timeZone),
      to: startOf(monthStart, timeZone),
      label: periodNames.last_month,
    };
  }
  return { from: new Date(now.getTime() - 30 * 86_400_000), to: now, label: periodNames["30d"] };
}

// Share of the time cars were rented, as a whole percentage (0 when there was nothing to rent).
export function utilizationPercent(rentedMs: number, carCount: number, period: Period) {
  const availableMs = carCount * (period.to.getTime() - period.from.getTime());
  return availableMs > 0 ? Math.round((rentedMs / availableMs) * 100) : 0;
}
