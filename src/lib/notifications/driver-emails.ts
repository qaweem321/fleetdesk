import { absoluteUrl } from "@/config/site";
import { buttonEmailHtml, sendEmail } from "@/lib/email";
import { endSentence } from "@/lib/format";
import type { BusinessSettings } from "@/lib/settings";

// Tells the customer how the check of their license went.
export async function sendLicenseReviewedEmail(
  customer: { name: string; email: string },
  decision: "approved" | "rejected",
  note: string | null,
  settings: BusinessSettings,
) {
  const url = absoluteUrl("/account/driver");
  const approved = decision === "approved";
  const message = approved
    ? `Hi ${customer.name}, your driver's license is checked. You're all set for pickup.`
    : `Hi ${customer.name}, we couldn't accept your driver's license${note ? `: ${endSentence(note)}` : "."} Please fix it in your account before your pickup.`;
  await sendEmail({
    to: customer.email,
    replyTo: settings.contactEmail,
    subject: approved
      ? "Your driver's license is checked"
      : "Your driver's license needs another look",
    text: `${message}\n\n${url}`,
    html: buttonEmailHtml({
      heading: approved ? "You're all set" : "Please check your license",
      message,
      buttonText: approved ? "View your account" : "Fix my driver details",
      url,
      footer: `${settings.businessName}`,
    }),
  });
}
