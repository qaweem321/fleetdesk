import { Badge, type BadgeTone } from "@/components/ui/badge";
import { type BookingStatus, bookingStatusLabels } from "@/lib/bookings/status";

const tones: Record<BookingStatus, BadgeTone> = {
  pending_payment: "warning",
  confirmed: "info",
  active: "success",
  completed: "neutral",
  cancelled: "danger",
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return <Badge tone={tones[status]}>{bookingStatusLabels[status]}</Badge>;
}
