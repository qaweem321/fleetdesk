import { and, eq, gt, isNull, lt, lte, type SQL, sql } from "drizzle-orm";
import { absoluteUrl } from "@/config/site";
import { db } from "@/db";
import { bookings, businessSettings, files } from "@/db/schema";
import { releaseExpiredHolds } from "@/lib/bookings/availability";
import { getBooking } from "@/lib/bookings/queries";
import { buttonEmailHtml, type Email, sendEmails } from "@/lib/email";
import { formatDateTime } from "@/lib/format";
import { listOpenTasks } from "@/lib/maintenance/queries";
import { today } from "@/lib/reports/period";
import { counterToday } from "@/lib/reports/queries";
import type { BusinessSettings } from "@/lib/settings";
import { deleteFiles } from "@/lib/storage";
import { localDateKey } from "@/lib/time-zone";

const DAY = 86_400_000;

type ReminderField = "pickupReminderSentAt" | "returnReminderSentAt";

// Marks bookings as reminded and returns them, in one statement: if the job runs twice at the
// same time, each booking is still reminded once.
async function claim(field: ReminderField, condition: SQL | undefined, now: Date) {
  const claimed = await db
    .update(bookings)
    .set({ [field]: now })
    .where(and(condition, isNull(bookings[field])))
    .returning({ id: bookings.id });
  return Promise.all(claimed.map((row) => getBooking(row.id)));
}

function reminderEmail(
  to: string,
  subject: string,
  message: string,
  url: string,
  settings: BusinessSettings,
): Email {
  return {
    to,
    subject,
    replyTo: settings.contactEmail,
    text: `${message}\n\n${url}`,
    html: buttonEmailHtml({
      heading: subject,
      message,
      buttonText: "View your booking",
      url,
      footer: settings.businessName,
    }),
  };
}

// Customers picking up or returning in the next 24 hours get a reminder.
async function customerReminders(settings: BusinessSettings, now: Date) {
  const soon = new Date(now.getTime() + DAY);
  const [pickups, returns] = await Promise.all([
    claim(
      "pickupReminderSentAt",
      and(
        eq(bookings.status, "confirmed"),
        gt(bookings.pickupAt, now),
        lte(bookings.pickupAt, soon),
      ),
      now,
    ),
    claim(
      "returnReminderSentAt",
      and(eq(bookings.status, "active"), gt(bookings.returnAt, now), lte(bookings.returnAt, soon)),
      now,
    ),
  ]);
  const when = (date: Date) => formatDateTime(date, settings.timeZone);
  const emails: Email[] = [];
  for (const booking of pickups) {
    if (booking) {
      emails.push(
        reminderEmail(
          booking.customerEmail,
          `See you soon: your ${booking.make} ${booking.model}`,
          `Hi ${booking.customerName}, your pickup is on ${when(booking.pickupAt)} at ${booking.pickupLocationName}${booking.pickupLocationAddress ? ` (${booking.pickupLocationAddress})` : ""}. Please bring your driver's license and a payment card in your name.`,
          absoluteUrl(`/account/bookings/${booking.id}`),
          settings,
        ),
      );
    }
  }
  for (const booking of returns) {
    if (booking) {
      emails.push(
        reminderEmail(
          booking.customerEmail,
          "Reminder: your car is due back",
          `Hi ${booking.customerName}, please return the ${booking.make} ${booking.model} by ${when(booking.returnAt)} at ${booking.returnLocationName}, with the same fuel level as at pickup.`,
          absoluteUrl(`/account/bookings/${booking.id}`),
          settings,
        ),
      );
    }
  }
  await sendEmails(emails);
  return emails.length;
}

// The morning summary for the business: today's pickups and returns, late cars, services due.
async function staffSummary(settings: BusinessSettings, now: Date) {
  if (!settings.contactEmail) {
    return false;
  }
  const [counter, tasks] = await Promise.all([
    counterToday(today(settings.timeZone, now), now),
    listOpenTasks(localDateKey(now, settings.timeZone)),
  ]);
  const due = tasks.filter((task) => task.urgency !== "later");
  if (counter.pickups.length + counter.returns.length + counter.late.length + due.length === 0) {
    return false;
  }
  // Once a day: claimed in one statement, so two runs at the same time can't both send it.
  const todayKey = localDateKey(now, settings.timeZone);
  const claimed = await db
    .update(businessSettings)
    .set({ summarySentOn: todayKey })
    .where(
      sql`${businessSettings.summarySentOn} is null or ${businessSettings.summarySentOn} < ${todayKey}`,
    )
    .returning({ id: businessSettings.id });
  if (claimed.length === 0) {
    return false;
  }
  const time = (date: Date) => formatDateTime(date, settings.timeZone);
  const lines = [
    `Pickups today: ${counter.pickups.length}`,
    ...counter.pickups.map(
      (row) =>
        `  ${time(row.pickupAt)} ${row.customerName}, ${row.make} ${row.model} (${row.plate}), ${row.placeName}`,
    ),
    `Returns today: ${counter.returns.length}`,
    ...counter.returns.map(
      (row) => `  ${time(row.returnAt)} ${row.customerName}, ${row.plate}, ${row.placeName}`,
    ),
  ];
  if (counter.late.length > 0) {
    lines.push(
      `Late back: ${counter.late.length}`,
      ...counter.late.map(
        (row) =>
          `  ${row.plate}, ${row.customerName} (${row.customerPhone}), due ${time(row.returnAt)}`,
      ),
    );
  }
  if (due.length > 0) {
    lines.push(
      `Services due: ${due.length}`,
      ...due.map(
        (task) =>
          `  ${task.plate}: ${task.task.title}${task.urgency === "overdue" ? " (overdue)" : ""}`,
      ),
    );
  }
  await sendEmails([
    {
      to: settings.contactEmail,
      subject: `Today at ${settings.businessName}`,
      text: `${lines.join("\n")}\n\n${absoluteUrl("/admin")}`,
    },
  ]);
  return true;
}

// Photos uploaded but never saved with anything (a form that was left) are deleted after a day.
async function deleteUnusedUploads(now: Date) {
  const unused = await db
    .select({ id: files.id })
    .from(files)
    .where(
      and(
        lt(files.createdAt, new Date(now.getTime() - DAY)),
        sql`not exists (select 1 from car_model_photos where file_id = ${files.id})`,
        sql`not exists (select 1 from inspection_photos where file_id = ${files.id})`,
        sql`not exists (select 1 from agreements where signature_file_id = ${files.id})`,
        sql`not exists (select 1 from business_settings where logo_file_id = ${files.id})`,
        sql`not exists (select 1 from driver_profiles where ${files.id} in (license_front_file_id, license_back_file_id, id_document_file_id))`,
      ),
    )
    .limit(500);
  await deleteFiles(unused.map((file) => file.id));
  return unused.length;
}

// Everything the app does once a day (see src/app/api/cron/daily/route.ts).
export async function runDailyJob(settings: BusinessSettings, now = new Date()) {
  await releaseExpiredHolds(now);
  const [reminders, summarySent, deletedUploads] = await Promise.all([
    customerReminders(settings, now),
    staffSummary(settings, now),
    deleteUnusedUploads(now),
  ]);
  return { reminders, summarySent, deletedUploads };
}
