import { SubmitButton } from "@/components/ui/submit-button";
import { identityCheckAvailable } from "@/lib/drivers/identity";
import type { BusinessSettings } from "@/lib/settings";
import { startMyIdentityCheck } from "./identity-actions";

// The quick alternative to sending photos: Stripe checks the license and matches a selfie.
export function IdentityCheck({ settings }: { settings: BusinessSettings }) {
  if (!identityCheckAvailable(settings)) {
    return null;
  }
  return (
    <section className="rounded-xl border border-border p-5 space-y-3">
      <h3 className="font-semibold">Verify in two minutes</h3>
      <p className="text-sm text-muted-foreground">
        Take a photo of your license and a selfie with your phone. Your license is checked
        automatically, without waiting for us.
      </p>
      <form action={startMyIdentityCheck}>
        <SubmitButton pendingText="Opening...">Verify my identity</SubmitButton>
      </form>
    </section>
  );
}
