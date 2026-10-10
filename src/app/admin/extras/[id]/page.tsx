import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DeleteForm } from "@/components/admin/delete-form";
import { Card, PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { db } from "@/db";
import { extras } from "@/db/schema";
import { requireStaff } from "@/lib/session";
import { requireSettings } from "@/lib/settings";
import { isUuid } from "@/lib/uuid";
import { deleteExtra, setExtraActive, updateExtra } from "../actions";
import { ExtraForm } from "../extra-form";

export const metadata: Metadata = { title: "Extra" };

export default async function ExtraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }
  const [, settings, [extra]] = await Promise.all([
    requireStaff("pricing:manage"),
    requireSettings(),
    db.select().from(extras).where(eq(extras.id, id)),
  ]);
  if (!extra) {
    notFound();
  }

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title={extra.name}
        back={{ label: "Extras", href: "/admin/extras" }}
        description={!extra.active && <Badge>Hidden from customers</Badge>}
      />
      <Card title="Details">
        <ExtraForm
          action={updateExtra.bind(null, extra.id)}
          values={extra}
          currency={settings.currency}
          submitLabel="Save extra"
        />
      </Card>
      <Card title={extra.active ? "Hide" : "Show"}>
        <p className="mb-3 text-sm text-muted-foreground">
          {extra.active
            ? "Customers can no longer add it. Existing bookings keep it."
            : "Customers can add it to bookings again."}
        </p>
        <form action={setExtraActive}>
          <input type="hidden" name="id" value={extra.id} />
          <input type="hidden" name="active" value={String(!extra.active)} />
          <SubmitButton variant="outline" pendingText="Saving...">
            {extra.active ? "Hide extra" : "Show extra"}
          </SubmitButton>
        </form>
      </Card>
      <Card title="Delete">
        <p className="mb-3 text-sm text-muted-foreground">
          Bookings that already include it keep their copy.
        </p>
        <DeleteForm
          action={deleteExtra}
          fields={{ id: extra.id }}
          confirm={`Delete ${extra.name}? This can't be undone.`}
          label="Delete extra"
        />
      </Card>
    </div>
  );
}
