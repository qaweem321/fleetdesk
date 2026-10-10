import { Badge, type BadgeTone } from "@/components/ui/badge";
import { type VehicleStatus, vehicleStatusLabels } from "@/lib/fleet/labels";

const tones: Record<VehicleStatus, BadgeTone> = {
  available: "success",
  maintenance: "warning",
  retired: "neutral",
};

export function VehicleStatusBadge({ status }: { status: VehicleStatus }) {
  return <Badge tone={tones[status]}>{vehicleStatusLabels[status]}</Badge>;
}
