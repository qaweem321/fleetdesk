import { Badge, type BadgeTone } from "@/components/ui/badge";
import { type DriverStatus, driverStatusLabels } from "@/lib/drivers/rules";

const tones: Record<keyof typeof driverStatusLabels, BadgeTone> = {
  none: "neutral",
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

export function DriverStatusBadge({ status }: { status: DriverStatus }) {
  const key = status ?? "none";
  return <Badge tone={tones[key]}>{driverStatusLabels[key]}</Badge>;
}
