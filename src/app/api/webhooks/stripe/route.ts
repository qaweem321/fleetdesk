import { after } from "next/server";
import type Stripe from "stripe";
import { getBooking } from "@/lib/bookings/queries";
import { identityNeedsInput, identityVerified } from "@/lib/drivers/identity";
import { sendBookingConfirmedEmails } from "@/lib/notifications/booking-emails";
import { completeCheckout, expireCheckout } from "@/lib/payments/checkout";
import { getStripe } from "@/lib/payments/stripe";
import { getSettings } from "@/lib/settings";

// Stripe tells the app here when a customer has paid or left the payment page, and how an
// identity check went. Add this URL in the Stripe dashboard (Developers > Webhooks) with the
// events checkout.session.completed and checkout.session.expired (with Stripe Identity also
// identity.verification_session.verified and identity.verification_session.requires_input),
// and put its signing secret in STRIPE_WEBHOOK_SECRET.
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return Response.json({ error: "STRIPE_WEBHOOK_SECRET is not set" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = await getStripe().webhooks.constructEventAsync(
      await request.text(),
      request.headers.get("stripe-signature") ?? "",
      secret,
    );
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 403 });
  }

  if (event.type === "checkout.session.completed") {
    const result = await completeCheckout(event.data.object.id);
    if (result?.confirmedNow) {
      after(async () => {
        const [booking, settings] = await Promise.all([
          getBooking(result.bookingId),
          getSettings(),
        ]);
        if (booking && settings) {
          await sendBookingConfirmedEmails(booking, settings).catch(console.error);
        }
      });
    }
  } else if (event.type === "identity.verification_session.verified") {
    await identityVerified(event.data.object.id);
  } else if (event.type === "identity.verification_session.requires_input") {
    await identityNeedsInput(event.data.object.id, event.data.object.last_error?.reason ?? null);
  } else if (event.type === "checkout.session.expired") {
    const bookingId = event.data.object.metadata?.bookingId;
    if (bookingId) {
      await expireCheckout(bookingId);
    }
  }
  return new Response(null, { status: 200 });
}
