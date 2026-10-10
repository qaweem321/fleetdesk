"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { createBooking } from "@/lib/bookings/create";
import { parseBookingDetails } from "@/lib/bookings/input";
import { getBooking } from "@/lib/bookings/queries";
import { formReader } from "@/lib/form-input";
import { sendBookingConfirmedEmails } from "@/lib/notifications/booking-emails";
import { buildQuote } from "@/lib/pricing/build-quote";
import type { Quote } from "@/lib/pricing/quote";
import { parseQuoteRequest } from "@/lib/pricing/request";
import { rateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/lib/session";
import { requireSettings } from "@/lib/settings";

export type QuoteState = {
  quote?: Quote;
  couponCode?: string | null;
  couponError?: string | null;
  error?: string;
};

// The live price on the booking page, recalculated when extras or the coupon change.
export async function quoteBooking(formData: FormData): Promise<QuoteState> {
  const [, settings] = await Promise.all([requireUser(), requireSettings()]);
  const parsed = parseQuoteRequest(formData.entries(), settings.timeZone);
  if ("error" in parsed) {
    return parsed;
  }
  const built = await buildQuote(parsed.request, settings, { forCustomer: true });
  if ("error" in built) {
    return built;
  }
  return {
    quote: built.quote,
    couponCode: built.coupon?.code ?? null,
    couponError: built.couponError,
  };
}

export type BookState = { error?: string; couponError?: string | null };

export async function bookCar(_previous: BookState, formData: FormData): Promise<BookState> {
  const [user, settings] = await Promise.all([requireUser(), requireSettings()]);
  const parsed = parseQuoteRequest(formData.entries(), settings.timeZone);
  if ("error" in parsed) {
    return parsed;
  }
  const details = parseBookingDetails(formReader(formData));
  if ("error" in details) {
    return details;
  }
  if (formData.get("acceptTerms") !== "on") {
    return { error: "Please accept the rental terms." };
  }
  // A real customer makes a handful of bookings; this stops scripts from emptying the fleet.
  const { allowed } = await rateLimit(`book:${user.id}`, 10, 60 * 60);
  if (!allowed) {
    return { error: "Too many bookings in a short time. Please try again later or call us." };
  }

  const result = await createBooking({
    request: parsed.request,
    customer: { id: user.id, name: user.name, email: user.email, phone: details.values.phone },
    note: details.values.note,
    settings,
  });
  if ("error" in result) {
    return result;
  }
  // Emails go out after the customer has been sent to their booking, so they don't wait.
  after(async () => {
    const booking = await getBooking(result.bookingId);
    if (booking) {
      await sendBookingConfirmedEmails(booking, settings).catch(console.error);
    }
  });
  redirect(`/account/bookings/${result.bookingId}?booked=1`);
}
