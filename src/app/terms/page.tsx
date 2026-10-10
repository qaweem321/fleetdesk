import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { DEFAULT_AGREEMENT_TERMS } from "@/lib/operations/agreement";
import { requireSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Terms" };

// Booking terms for the website, plus the rental terms customers sign at pickup (the same text
// as Settings > Rental agreement).
export default async function TermsPage() {
  const settings = await requireSettings();
  const name = settings.businessName;
  const hours = settings.freeCancellationHours;

  return (
    <LegalPage title="Terms" lastUpdated="October 10, 2026">
      <p>
        These terms apply when you book a car from {name} on this website. By booking you agree to
        them, and at pickup you sign the rental agreement below.
      </p>

      <h2>Your account</h2>
      <p>
        Give accurate information and keep your password safe. You&apos;re responsible for bookings
        made with your account.
      </p>

      <h2>Booking and prices</h2>
      <p>
        The price shown before you book is the price you pay for the rental and the extras you
        chose, taxes included. Extra charges can apply after the return, as described in the rental
        terms (for example for late return, missing fuel, extra distance or damage).
      </p>

      <h2>Drivers</h2>
      <p>
        Every driver must be at least {settings.minDriverAge} years old on the pickup date and show
        a valid driver&apos;s license. We may refuse a rental if this can&apos;t be checked.
      </p>

      <h2>Cancellation</h2>
      <p>
        {hours > 0
          ? `You can cancel online for free until ${hours} hours before pickup; anything paid online is refunded in full. After that, please contact us.`
          : "You can cancel online for free until the pickup time; anything paid online is refunded in full."}{" "}
        We may cancel a booking if the car can&apos;t be provided; you then get a full refund.
      </p>

      <h2>Rental terms (signed at pickup)</h2>
      <p className="whitespace-pre-line">
        {(settings.agreementTerms ?? DEFAULT_AGREEMENT_TERMS).trim()}
      </p>

      <h2>Privacy</h2>
      <p>
        How we handle your data is explained in our <Link href="/privacy">Privacy Policy</Link>.
      </p>

      {settings.contactEmail && (
        <>
          <h2>Contact</h2>
          <p>
            Questions? Email <a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a>
            {settings.contactPhone ? ` or call ${settings.contactPhone}` : ""}.
          </p>
        </>
      )}
    </LegalPage>
  );
}
