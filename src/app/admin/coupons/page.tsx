import type { Metadata } from "next";
import { Card, EmptyState, PageHeader } from "@/components/admin/page-header";
import { ActionForm, ActionMessage } from "@/components/ui/action-form";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { listCoupons } from "@/lib/pricing/queries";
import { requireStaff } from "@/lib/session";
import { requireSettings } from "@/lib/settings";
import { createCoupon, deleteCoupon, setCouponActive } from "./actions";

export const metadata: Metadata = { title: "Coupons" };

const showDate = (key: string) => formatDate(new Date(`${key}T12:00:00Z`));

export default async function CouponsPage() {
  const [, settings, all] = await Promise.all([
    requireStaff("pricing:manage"),
    requireSettings(),
    listCoupons(),
  ]);

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader
        title="Coupons"
        description="Discount codes customers type when booking. They take money off the rental price (not extras, fees or tax)."
      />

      {all.length === 0 ? (
        <EmptyState title="No coupons yet">Create your first code below.</EmptyState>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {all.map((coupon) => {
            const conditions = [
              coupon.validFrom && `from ${showDate(coupon.validFrom)}`,
              coupon.validUntil && `until ${showDate(coupon.validUntil)}`,
              coupon.minDays && `${coupon.minDays}+ days`,
            ].filter(Boolean);
            return (
              <li key={coupon.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="flex items-center gap-2 font-mono font-medium">
                    {coupon.code}
                    {!coupon.active && <Badge>Paused</Badge>}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {coupon.type === "percent"
                      ? `${coupon.amount}% off`
                      : `${formatMoney(coupon.amount, settings.currency)} off`}
                    {conditions.length > 0 && ` · ${conditions.join(", ")}`} · used{" "}
                    {coupon.timesUsed}
                    {coupon.maxUses ? ` of ${coupon.maxUses}` : ""} times
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <form action={setCouponActive}>
                    <input type="hidden" name="id" value={coupon.id} />
                    <input type="hidden" name="active" value={String(!coupon.active)} />
                    <SubmitButton variant="link" size="inline" pendingText="Saving...">
                      {coupon.active ? "Pause" : "Resume"}
                    </SubmitButton>
                  </form>
                  <form action={deleteCoupon}>
                    <input type="hidden" name="id" value={coupon.id} />
                    <SubmitButton
                      variant="danger-link"
                      size="inline"
                      pendingText="Deleting..."
                      confirm={`Delete the coupon ${coupon.code}? Bookings that used it keep their discount.`}
                    >
                      Delete
                    </SubmitButton>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Card title="Create a coupon">
        <ActionForm action={createCoupon} resetOnSuccess className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Code" htmlFor="coupon-code">
              <Input
                id="coupon-code"
                name="code"
                required
                maxLength={30}
                placeholder="SUMMER-10"
                className="font-mono uppercase"
              />
            </Field>
            <Field label="Discount" htmlFor="coupon-type">
              <Select id="coupon-type" name="type" className="w-full">
                <option value="percent">Percentage (%)</option>
                <option value="fixed">Fixed amount ({settings.currency})</option>
              </Select>
            </Field>
            <Field label="Amount" htmlFor="coupon-amount" hint="10 = 10% or 10.00 off">
              <Input id="coupon-amount" name="amount" required inputMode="decimal" />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Valid from" htmlFor="coupon-from" hint="Optional">
              <Input id="coupon-from" name="validFrom" type="date" />
            </Field>
            <Field label="Valid until" htmlFor="coupon-until" hint="Optional">
              <Input id="coupon-until" name="validUntil" type="date" />
            </Field>
            <Field label="Minimum days" htmlFor="coupon-min-days" hint="Optional">
              <Input id="coupon-min-days" name="minDays" type="number" min={1} max={365} />
            </Field>
            <Field label="Max uses" htmlFor="coupon-max-uses" hint="Empty: unlimited">
              <Input id="coupon-max-uses" name="maxUses" type="number" min={1} />
            </Field>
          </div>
          <ActionMessage />
          <SubmitButton pendingText="Creating...">Create coupon</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
