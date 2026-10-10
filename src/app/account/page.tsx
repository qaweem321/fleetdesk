import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "My bookings" };

export default function MyBookingsPage() {
  return (
    <div className="rounded-xl border border-dashed border-border p-10 text-center">
      <p className="font-medium">No bookings yet</p>
      <p className="mt-1 text-sm text-muted-foreground">When you book a car, it shows up here.</p>
      <ButtonLink href="/" className="mt-4">
        Find a car
      </ButtonLink>
    </div>
  );
}
