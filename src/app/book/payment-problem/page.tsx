import type { Metadata } from "next";
import { PublicPage } from "@/components/site/public-page";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Payment problem", robots: { index: false } };

// Shown when the online payment page couldn't be opened. Nothing was charged and the booking
// was cancelled, so the customer can simply try again.
export default function PaymentProblemPage() {
  return (
    <PublicPage>
      <div className="mx-auto max-w-xl px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold">We couldn&apos;t open the payment page</h1>
        <p className="text-muted-foreground">
          Nothing was charged and the booking wasn&apos;t made. Please try again in a moment, or
          contact us to book by phone.
        </p>
        <ButtonLink href="/cars">Back to the cars</ButtonLink>
      </div>
    </PublicPage>
  );
}
