import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { requireStaff } from "@/lib/session";
import { createCarModel } from "../actions";
import { CarModelForm } from "../car-model-form";

export const metadata: Metadata = { title: "Add car model" };

export default async function NewCarModelPage() {
  await requireStaff("fleet:manage");

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Add a car model"
        back={{ label: "Cars", href: "/admin/cars" }}
        description="What customers book. You add its vehicles (number plates) next."
      />
      <CarModelForm action={createCarModel} submitLabel="Add car model" />
    </div>
  );
}
