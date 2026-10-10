import Link from "next/link";
import { db } from "@/db";
import { carModels, locations, vehicles } from "@/db/schema";

type Step = { label: string; href: string; done: boolean };

// The first things a new owner sets up, in order. Hidden once everything is done.
export async function GetStarted() {
  const [locationCount, modelCount, vehicleCount] = await Promise.all([
    db.$count(locations),
    db.$count(carModels),
    db.$count(vehicles),
  ]);
  const steps: Step[] = [
    { label: "Add your locations (branches)", href: "/admin/locations", done: locationCount > 0 },
    {
      label: "Add the car models customers can book",
      href: "/admin/cars/new",
      done: modelCount > 0,
    },
    {
      label: "Add the vehicles (number plates)",
      href: "/admin/vehicles/new",
      done: vehicleCount > 0,
    },
  ];
  if (steps.every((step) => step.done)) {
    return null;
  }

  return (
    <section className="rounded-xl border border-border p-5">
      <h2 className="text-lg font-semibold">Get started</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        A few steps before customers can book online.
      </p>
      <ol className="mt-4 space-y-2">
        {steps.map((step, index) => (
          <li key={step.href} className="flex items-center gap-3 text-sm">
            <span
              aria-hidden="true"
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                step.done ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
              }`}
            >
              {step.done ? "✓" : index + 1}
            </span>
            {step.done ? (
              <span className="text-muted-foreground line-through">{step.label}</span>
            ) : (
              <Link href={step.href} className="text-link hover:underline">
                {step.label}
              </Link>
            )}
            <span className="sr-only">{step.done ? "(done)" : "(to do)"}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
