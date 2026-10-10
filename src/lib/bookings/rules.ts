import { rentalDays } from "@/lib/pricing/rental-days";

type Rules = { minLeadHours: number; maxRentalDays: number; graceMinutes: number };

// The booking rules from Settings, for a customer booking online: the return comes after the
// pickup, the pickup is far enough ahead, and the rental isn't too long. Null when all is fine.
export function bookingRuleProblem(
  start: Date,
  end: Date,
  rules: Rules,
  now = new Date(),
): string | null {
  if (end <= start) {
    return "The return must be after the pickup.";
  }
  if (start.getTime() < now.getTime() + rules.minLeadHours * 3_600_000) {
    return rules.minLeadHours > 0
      ? `Online bookings need at least ${rules.minLeadHours} hours' notice. For an earlier pickup, please call us.`
      : "The pickup time has already passed.";
  }
  if (rentalDays(start, end, rules.graceMinutes) > rules.maxRentalDays) {
    return `Online bookings can be at most ${rules.maxRentalDays} days. For longer rentals, please contact us.`;
  }
  return null;
}
