import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { requireStaff } from "@/lib/session";
import { requireSettings } from "@/lib/settings";
import { createCarModel } from "../actions";
import { CarModelForm } from "../car-model-form";

export const metadata: Metadata = { title: "Add car model" };

export default async function NewCarModelPage() {
  const [, settings] = await Promise.all([requireStaff("fleet:manage"), requireSettings()]);

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Add a car model"
        back={{ label: "Cars", href: "/admin/cars" }}
        description="What customers book. You add its vehicles (number plates) next."
      />
      <CarModelForm
        action={createCarModel}
        currency={settings.currency}
        distanceUnit={settings.distanceUnit}
        submitLabel="Add car model"
      />
    </div>
  );
}
