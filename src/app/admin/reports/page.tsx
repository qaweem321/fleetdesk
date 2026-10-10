import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { Tabs } from "@/components/site/tabs";
import { formatMoney } from "@/lib/money";
import {
  type PeriodName,
  periodNames,
  resolvePeriod,
  utilizationPercent,
} from "@/lib/reports/period";
import { modelReport, revenue } from "@/lib/reports/queries";
import { requireStaff } from "@/lib/session";
import { requireSettings } from "@/lib/settings";
import { firstParam, type RawSearchParams } from "@/lib/url-params";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const [, settings, params] = await Promise.all([
    requireStaff("reports:view"),
    requireSettings(),
    searchParams,
  ]);
  const chosen = firstParam(params.period);
  const name: PeriodName = chosen === "month" || chosen === "last_month" ? chosen : "30d";
  const period = resolvePeriod(name, settings.timeZone);
  const [income, models] = await Promise.all([revenue(period), modelReport(period)]);
  const money = (amount: number) => formatMoney(amount, settings.currency);
  const totals = models.reduce(
    (sum, row) => ({
      bookings: sum.bookings + row.bookingCount,
      value: sum.value + row.bookedValue,
      rentedMs: sum.rentedMs + row.rentedMs,
      cars: sum.cars + row.carCount,
    }),
    { bookings: 0, value: 0, rentedMs: 0, cars: 0 },
  );
  const href = (value: PeriodName) =>
    value === "30d" ? "/admin/reports" : `/admin/reports?period=${value}`;

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader title="Reports" description="Income and how busy your cars are." />
      <Tabs
        items={(Object.keys(periodNames) as PeriodName[]).map((value) => ({
          label: periodNames[value],
          href: href(value),
        }))}
        activeHref={href(name)}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Income received", value: money(income), hint: "Payments minus refunds" },
          { label: "Bookings starting", value: String(totals.bookings), hint: "Not cancelled" },
          {
            label: "Value of those bookings",
            value: money(totals.value),
            hint: "Before extra charges",
          },
          {
            label: "Fleet utilization",
            value: `${utilizationPercent(totals.rentedMs, totals.cars, period)}%`,
            hint: "Share of the time cars were rented",
          },
        ].map((tile) => (
          <div key={tile.label} className="rounded-xl border border-border p-4">
            <p className="text-sm text-muted-foreground">{tile.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{tile.value}</p>
            <p className="text-xs text-subtle-foreground">{tile.hint}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Car model</th>
              <th className="px-4 py-2 font-medium text-right">Cars</th>
              <th className="px-4 py-2 font-medium text-right">Bookings</th>
              <th className="px-4 py-2 font-medium text-right">Value</th>
              <th className="px-4 py-2 font-medium">Utilization</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {models.map((row) => {
              const percent = utilizationPercent(row.rentedMs, row.carCount, period);
              return (
                <tr key={row.id}>
                  <td className="px-4 py-2">
                    {row.make} {row.model}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{row.carCount}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{row.bookingCount}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{money(row.bookedValue)}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-24 overflow-hidden rounded-full bg-muted"
                        aria-hidden="true"
                      >
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${Math.min(100, percent)}%` }}
                        />
                      </div>
                      <span className="tabular-nums">{percent}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
