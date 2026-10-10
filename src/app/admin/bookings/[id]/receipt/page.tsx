import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReceiptDocument } from "@/components/documents";
import { getBooking } from "@/lib/bookings/queries";
import { requireStaff } from "@/lib/session";
import { requireSettings } from "@/lib/settings";
import { isUuid } from "@/lib/uuid";

export const metadata: Metadata = { title: "Receipt" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }
  const [, settings, booking] = await Promise.all([
    requireStaff(),
    requireSettings(),
    getBooking(id),
  ]);
  if (!booking) {
    notFound();
  }
  return (
    <ReceiptDocument
      booking={booking}
      settings={settings}
      backHref={`/admin/bookings/${booking.id}`}
    />
  );
}
