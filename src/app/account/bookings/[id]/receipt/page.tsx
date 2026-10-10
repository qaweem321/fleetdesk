import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReceiptDocument } from "@/components/documents";
import { getBooking } from "@/lib/bookings/queries";
import { requireUser } from "@/lib/session";
import { requireSettings } from "@/lib/settings";
import { isUuid } from "@/lib/uuid";

export const metadata: Metadata = { title: "Receipt" };

// The customer's own copy (only their own bookings).
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user, settings] = await Promise.all([params, requireUser(), requireSettings()]);
  const booking = isUuid(id) ? await getBooking(id, user.id) : null;
  if (!booking) {
    notFound();
  }
  return (
    <ReceiptDocument
      booking={booking}
      settings={settings}
      backHref={`/account/bookings/${booking.id}`}
    />
  );
}
