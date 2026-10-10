import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { requireSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Privacy Policy" };

// Describes what Fleetdesk actually stores. Update it when you add features.
export default async function PrivacyPage() {
  const settings = await requireSettings();
  const name = settings.businessName;
  const contact = settings.contactEmail;

  return (
    <LegalPage title="Privacy Policy" lastUpdated="October 10, 2026">
      <p>
        This policy explains what personal data {name} collects when you rent a car from us, and
        why.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>Account details: your name, email address and a securely hashed password.</li>
        <li>
          Booking details: dates, locations, the car, extras, prices, your phone number and any note
          you add.
        </li>
        <li>
          Driver details: your date of birth, driver&apos;s license number, issuing country and
          expiry date, and the photos of your license and ID that you upload. If you use the
          automatic identity check, it is done by Stripe, who tell us whether it succeeded.
        </li>
        <li>
          Rental records: inspection photos of the car at pickup and return, mileage and fuel
          levels, the rental agreement you sign (with your signature and the network address it was
          signed from), and extra charges.
        </li>
        <li>
          Payment records: what you paid and what was refunded. Card details are handled by our
          payment provider (Stripe) and never reach our servers.
        </li>
        <li>
          Session details: your network address and browser type, to keep you logged in and protect
          your account.
        </li>
      </ul>

      <h2>How we use it</h2>
      <p>
        Only to run your rental: confirming bookings, checking that drivers may drive, handing over
        and taking back the car, settling payments and deposits, sending booking emails and
        reminders, keeping the records the law asks of us, and preventing abuse. We don&apos;t sell
        your data or use it for advertising.
      </p>

      <h2>Who can see it</h2>
      <p>
        Your documents and rental records are only visible to you and to our staff. We share data
        only with providers that help us run the service, as needed: hosting and database, email
        delivery, payments and identity checks (Stripe).
      </p>

      <h2>Cookies</h2>
      <p>
        We use one essential cookie to keep you logged in. Your light or dark theme choice is saved
        in your browser. We don&apos;t use tracking or advertising cookies.
      </p>

      <h2>How long we keep it</h2>
      <p>
        As long as your account exists, and rental and payment records for as long as the law
        requires. You can delete your account from the Account page once you have no upcoming or
        ongoing rental.
      </p>

      <h2>Your rights</h2>
      <p>
        You can see and update your details in your account, and ask for a copy or deletion of your
        data at any time.
      </p>

      {contact && (
        <>
          <h2>Contact</h2>
          <p>
            Questions or requests? Email <a href={`mailto:${contact}`}>{contact}</a>.
          </p>
        </>
      )}
    </LegalPage>
  );
}
