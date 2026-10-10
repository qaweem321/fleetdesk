import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { requireSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Terms of Service" };

export default async function TermsPage() {
  const settings = await requireSettings();
  const name = settings.businessName;
  const companyName = settings.businessName;
  const supportEmail = settings.contactEmail ?? "";
  return (
    <LegalPage title="Terms of Service" lastUpdated="October 5, 2026">
      <p>
        These terms apply to your use of {name}, provided by {companyName} (&quot;we&quot;,
        &quot;us&quot;). By creating an account you agree to them.
      </p>

      <h2>Your account</h2>
      <p>
        You must give accurate information and keep your password safe. You are responsible for
        everything that happens in your account and in the organizations you own.
      </p>

      <h2>Organizations</h2>
      <p>
        The owner of an organization controls who can access it and what role they have. Owners can
        remove members and delete the organization along with its data.
      </p>

      <h2>Payments</h2>
      <p>
        Paid plans are billed monthly in advance through our payment provider. You can cancel any
        time from the Billing page; your plan stays active until the end of the paid period. Fees
        are not refunded except where the law requires it.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Don&apos;t break the law or anyone else&apos;s rights using the service.</li>
        <li>Don&apos;t try to access other organizations&apos; data or disrupt the service.</li>
        <li>Don&apos;t send spam through invitations or other features.</li>
      </ul>
      <p>We may suspend accounts that break these rules.</p>

      <h2>Your data</h2>
      <p>
        You own the data you put into {name}. How we handle it is explained in our{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>Liability</h2>
      <p>
        The service is provided &quot;as is&quot;. To the extent the law allows, we are not liable
        for indirect losses, and our total liability is limited to what you paid us in the last 12
        months.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms. If the changes are important, we will tell you by email before
        they take effect.
      </p>

      <h2>Contact</h2>
      <p>
        Questions? Email <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
      </p>
    </LegalPage>
  );
}
