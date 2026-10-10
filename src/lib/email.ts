import { siteConfig } from "@/config/site";
import { isDemoMode } from "@/lib/demo";

export type Email = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  // Extra headers, e.g. List-Unsubscribe on update emails.
  headers?: Record<string, string>;
  // Where replies go, e.g. the business's contact email.
  replyTo?: string | null;
};

// Resend accepts up to 100 emails per batch call and about 2 calls per second.
const BATCH_SIZE = 100;
const PAUSE_BETWEEN_BATCHES_MS = 600;

function canSend() {
  return Boolean(process.env.RESEND_API_KEY) && !isDemoMode();
}

// Without Resend (development) or in demo mode, emails are printed instead of sent.
function printEmail({ to, subject, text }: Email) {
  console.log(
    `
--- Email (${process.env.RESEND_API_KEY ? "demo" : "dev"} mode, not sent) ---
To: ${to}
Subject: ${subject}

${text}
---------------------------------
`,
  );
}

function toResend({ to, subject, text, html, headers, replyTo }: Email) {
  return {
    reply_to: replyTo || undefined,
    from: process.env.EMAIL_FROM || `${siteConfig.name} <onboarding@resend.dev>`,
    to,
    subject,
    text,
    html,
    headers,
  };
}

async function postToResend(path: string, body: unknown) {
  const response = await fetch(`https://api.resend.com${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Sending email failed: ${response.status} ${await response.text()}`);
  }
}

export async function sendEmail(email: Email) {
  if (!canSend()) {
    printEmail(email);
    return;
  }
  await postToResend("/emails", toResend(email));
}

// Sends many emails with as few API calls as possible (100 per call).
export async function sendEmails(emails: Email[]) {
  if (!canSend()) {
    emails.forEach(printEmail);
    return;
  }
  for (let start = 0; start < emails.length; start += BATCH_SIZE) {
    if (start > 0) {
      await new Promise((resolve) => setTimeout(resolve, PAUSE_BETWEEN_BATCHES_MS));
    }
    await postToResend("/emails/batch", emails.slice(start, start + BATCH_SIZE).map(toResend));
  }
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

type ButtonEmail = {
  heading: string;
  message: string;
  buttonText: string;
  url: string;
  footer: string;
};

export function buttonEmailHtml({ heading, message, buttonText, url, footer }: ButtonEmail) {
  const safeUrl = escapeHtml(url);
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f9fafb;font-family:Arial,sans-serif;color:#111827;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;">
      <h1 style="margin:0 0 16px;font-size:20px;">${escapeHtml(heading)}</h1>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#374151;">${escapeHtml(message)}</p>
      <a href="${safeUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:8px;">${escapeHtml(buttonText)}</a>
      <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#6b7280;">If the button doesn't work, open this link:<br><a href="${safeUrl}" style="color:#2563eb;word-break:break-all;">${safeUrl}</a></p>
      <p style="margin:24px 0 0;font-size:13px;color:#6b7280;">${escapeHtml(footer)}</p>
    </div>
  </body>
</html>`;
}

type DetailsEmail = {
  heading: string;
  message: string;
  // Label and value pairs shown as a table: "Pickup" -> "Nov 2, 2026, 10:00 AM".
  rows: [string, string][];
  button?: { text: string; url: string };
  footer?: string;
};

// An email with a short message and a table of details (booking confirmations, receipts).
export function detailsEmailHtml({ heading, message, rows, button, footer }: DetailsEmail) {
  const table = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#6b7280;vertical-align:top;white-space:nowrap;">${escapeHtml(label)}</td><td style="padding:6px 0;color:#111827;">${escapeHtml(value).replaceAll("\n", "<br>")}</td></tr>`,
    )
    .join("");
  const action = button
    ? `<a href="${escapeHtml(button.url)}" style="display:inline-block;margin-top:24px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:8px;">${escapeHtml(button.text)}</a>`
    : "";
  const note = footer
    ? `<p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#6b7280;">${escapeHtml(footer)}</p>`
    : "";
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f9fafb;font-family:Arial,sans-serif;color:#111827;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;">
      <h1 style="margin:0 0 16px;font-size:20px;">${escapeHtml(heading)}</h1>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#374151;">${escapeHtml(message)}</p>
      <table style="border-collapse:collapse;font-size:14px;">${table}</table>
      ${action}
      ${note}
    </div>
  </body>
</html>`;
}

// The same details as plain text, for email apps that don't show HTML.
export function detailsEmailText({ message, rows, button, footer }: DetailsEmail) {
  const lines = [
    message,
    "",
    ...rows.map(([label, value]) => `${label}: ${value.replaceAll("\n", ", ")}`),
  ];
  if (button) {
    lines.push("", `${button.text}: ${button.url}`);
  }
  if (footer) {
    lines.push("", footer);
  }
  return lines.join("\n");
}
