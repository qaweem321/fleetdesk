"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { cancelBooking } from "@/lib/bookings/cancel";
import { createBooking } from "@/lib/bookings/create";
import { parseBookingDetails } from "@/lib/bookings/input";
import { getBooking } from "@/lib/bookings/queries";
import { getDriverProfile, saveDateOfBirth } from "@/lib/drivers/profile";
import { driverAgeProblem } from "@/lib/drivers/rules";
import { formReader } from "@/lib/form-input";
import { sendBookingConfirmedEmails } from "@/lib/notifications/booking-emails";
import { startCheckout } from "@/lib/payments/checkout";
import { paymentMethodsFor } from "@/lib/payments/options";
import { buildQuote } from "@/lib/pricing/build-quote";
import type { Quote } from "@/lib/pricing/quote";
import { parseQuoteRequest } from "@/lib/pricing/request";
import { rateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/lib/session";
import { requireSettings } from "@/lib/settings";
import { localDateKey, parseDateKey } from "@/lib/time-zone";

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
  // The driver's age on the pickup date. A saved date of birth always wins (staff may have
  // checked it already); the form's field is only for people who haven't given one yet.
  const profile = await getDriverProfile(user.id);
  const typedBirthDate = profile?.dateOfBirth
    ? null
    : parseDateKey(String(formData.get("dateOfBirth") ?? ""));
  const dateOfBirth = profile?.dateOfBirth ?? typedBirthDate;
  const ageProblem = driverAgeProblem(
    dateOfBirth,
    localDateKey(parsed.request.start, settings.timeZone),
    settings.minDriverAge,
  );
  if (ageProblem) {
    return { error: ageProblem };
  }
  const methods = paymentMethodsFor(settings.paymentOptions);
  const chosen = String(formData.get("paymentMethod") ?? methods[0]);
  const paymentMethod = methods.find((method) => method === chosen);
  if (!paymentMethod) {
    return { error: "Please choose how you'd like to pay." };
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
    paymentMethod,
    settings,
  });
  if ("error" in result) {
    return result;
  }
  if (typedBirthDate) {
    await saveDateOfBirth(user.id, typedBirthDate);
  }
  if (paymentMethod === "online") {
    // To Stripe's payment page. The confirmation email goes out once the payment is in.
    redirect(await checkoutUrl(result.bookingId, user));
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

// The payment page for a new online booking. If Stripe can't be reached, the booking is
// cancelled (the car is let go) and the customer sees an error instead.
async function checkoutUrl(bookingId: string, user: { id: string; name: string; email: string }) {
  const booking = await getBooking(bookingId);
  try {
    if (!booking) {
      throw new Error("The booking disappeared before payment.");
    }
    return await startCheckout(booking, user);
  } catch (error) {
    console.error(error);
    await cancelBooking(bookingId, "The online payment couldn't be started.");
    return `/book/payment-problem`;
  }
}
