import { DEMO_PASSWORD, demoLogins, demoTestCard, isDemoMode } from "@/lib/demo";
import { stripeConfigured } from "@/lib/payments/options";

// Tells demo visitors how to try each side of the app, so nothing looks like a bug.
export function DemoBanner() {
  if (!isDemoMode()) {
    return null;
  }
  return (
    <div className="border-b border-border bg-muted px-4 py-2 text-center text-sm text-muted-foreground print:hidden">
      <strong className="text-foreground">Live demo:</strong> log in as{" "}
      <span className="font-mono">{demoLogins.owner.email}</span> (owner),{" "}
      <span className="font-mono">{demoLogins.agent.email}</span> (counter agent) or{" "}
      <span className="font-mono">{demoLogins.customer.email}</span> (customer), password{" "}
      <span className="font-mono">{DEMO_PASSWORD}</span>. Emails are turned off and the demo is
      reset regularly.
      {stripeConfigured() && (
        <>
          {" "}
          To pay online, enter your own email at checkout and use test card {demoTestCard.number},
          expiry {demoTestCard.expiry}, CVC {demoTestCard.cvc}. No real money is charged.
        </>
      )}
    </div>
  );
}
