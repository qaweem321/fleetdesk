import type { DriverProfile } from "@/lib/drivers/profile";
import { endSentence } from "@/lib/format";

const styles = {
  none: "border-border bg-muted",
  pending: "border-warning/40 bg-warning/10",
  approved: "border-success/40 bg-success/10",
  rejected: "border-danger/40 bg-danger/10",
};

// Where the customer's license check stands, in one sentence.
export function DriverStatusNote({ profile }: { profile: DriverProfile | null }) {
  const status = profile?.status ?? "none";
  const text = {
    // A failed automatic check leaves a note saying what to do.
    none: profile?.reviewNote ?? "We haven't received your license yet.",
    pending: "Thanks! Your license is waiting to be checked. You can still change it below.",
    approved:
      profile?.verifiedBy === "stripe_identity"
        ? "Your license and identity are verified. You're all set for pickup."
        : "Your license is checked. You're all set for pickup.",
    rejected: `We couldn't accept your license${profile?.reviewNote ? `: ${endSentence(profile.reviewNote)}` : "."} Please fix it and send it again.`,
  }[status];

  return (
    <p role="status" className={`rounded-xl border p-4 text-sm ${styles[status]}`}>
      {text}
    </p>
  );
}
