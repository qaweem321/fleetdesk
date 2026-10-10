import type { Metadata } from "next";
import Link from "next/link";
import { Card, EmptyState, PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { listExtras } from "@/lib/pricing/queries";
import { requireStaff } from "@/lib/session";
import { requireSettings } from "@/lib/settings";
import { createExtra } from "./actions";
import { ExtraForm } from "./extra-form";

export const metadata: Metadata = { title: "Extras" };

export default async function ExtrasPage() {
  const [, settings, all] = await Promise.all([
    requireStaff("pricing:manage"),
    requireSettings(),
    listExtras(),
  ]);

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader
        title="Extras"
        description="Things customers can add when they book: child seat, GPS, extra driver, full insurance..."
      />

      {all.length === 0 ? (
        <EmptyState title="No extras yet">Add your first one below.</EmptyState>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {all.map((extra) => (
            <li key={extra.id}>
              <Link
                href={`/admin/extras/${extra.id}`}
                className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-muted"
              >
                <div className="min-w-0">
                  <p className="font-medium">{extra.name}</p>
                  {extra.description && (
                    <p className="truncate text-sm text-subtle-foreground">{extra.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {formatMoney(extra.price, settings.currency)}{" "}
                  {extra.charge === "per_day" ? "per day" : "once"}
                  {!extra.active && <Badge>Hidden</Badge>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Card title="Add an extra">
        <ExtraForm
          action={createExtra}
          currency={settings.currency}
          submitLabel="Add extra"
          resetOnSuccess
        />
      </Card>
    </div>
  );
}
