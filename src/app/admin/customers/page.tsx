import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { DriverStatusBadge } from "@/components/driver-status-badge";
import { Pager } from "@/components/pager";
import { Tabs } from "@/components/site/tabs";
import { listRenters, type RenterFilter } from "@/lib/drivers/queries";
import { formatDateTime } from "@/lib/format";
import { requireStaff } from "@/lib/session";
import { requireSettings } from "@/lib/settings";
import { buildHref, firstParam, parsePage, type RawSearchParams } from "@/lib/url-params";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;
  const filter: RenterFilter = firstParam(params.show) === "all" ? "all" : "review";
  const page = parsePage(params.page);
  const [, settings, { rows, hasMore }] = await Promise.all([
    requireStaff(),
    requireSettings(),
    listRenters(filter, page),
  ]);
  const href = (values: { show: string; page: number }) =>
    buildHref("/admin/customers", values, { show: "review", page: 1 });

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Customers"
        description="Driver's licenses to check, and everyone who has booked."
      />
      <div className="mb-4">
        <Tabs
          items={[
            { label: "Licenses to check", href: href({ show: "review", page: 1 }) },
            { label: "All customers", href: href({ show: "all", page: 1 }) },
          ]}
          activeHref={href({ show: filter, page: 1 })}
        />
      </div>
      {rows.length === 0 ? (
        <EmptyState
          title={filter === "review" ? "No licenses waiting to be checked" : "No customers yet"}
        />
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {rows.map((renter) => (
            <li key={renter.id}>
              <Link
                href={`/admin/customers/${renter.id}`}
                className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-muted"
              >
                <div className="min-w-0">
                  <p className="font-medium">{renter.name}</p>
                  <p className="text-sm text-subtle-foreground">
                    {renter.email}
                    {renter.phone && ` · ${renter.phone}`}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {filter === "review" && renter.submittedAt
                    ? `Sent ${formatDateTime(renter.submittedAt, settings.timeZone)}`
                    : `${renter.bookingCount} ${renter.bookingCount === 1 ? "booking" : "bookings"}`}
                  <DriverStatusBadge status={renter.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pager
        previousHref={page > 1 ? href({ show: filter, page: page - 1 }) : null}
        nextHref={hasMore ? href({ show: filter, page: page + 1 }) : null}
      />
    </div>
  );
}
