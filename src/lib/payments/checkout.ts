import { and, eq } from "drizzle-orm";
import type Stripe from "stripe";
import { absoluteUrl } from "@/config/site";
import { db } from "@/db";
import { atomic } from "@/db/atomic";
import { bookings, payments } from "@/db/schema";
import { cancelBooking } from "@/lib/bookings/cancel";
import { CHECKOUT_MINUTES, HOLD_MINUTES } from "./options";
import { getStripe, stripeCurrency, stripeCustomerFor } from "./stripe";

type CheckoutBooking = {
  id: string;
  reference: string;
  total: number;
  currency: string;
  days: number;
  make: string;
  model: string;
};

type Customer = { id: string; name: string; email: string };

// Opens Stripe's payment page for a booking waiting for payment. The card is saved for later
// (setup_future_usage), so staff can hold the deposit at pickup and charge extras after the
// return without asking for the card again. The car stays held a little longer than the page
// stays open, so a payment can never arrive for a car that was let go.
export async function startCheckout(booking: CheckoutBooking, customer: Customer) {
  const now = Date.now();
  const customerId = await stripeCustomerFor(customer);
  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    // Cards only: the saved card is used again for the deposit and charges after the return.
    allowed_payment_method_types: ["card"],
    client_reference_id: booking.id,
    metadata: { bookingId: booking.id },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: stripeCurrency(booking.currency),
          unit_amount: booking.total,
          product_data: {
            name: `${booking.make} ${booking.model}, ${booking.days} ${booking.days === 1 ? "day" : "days"}`,
            description: `Booking ${booking.reference}`,
          },
        },
      },
    ],
    payment_intent_data: {
      setup_future_usage: "off_session",
      description: `Booking ${booking.reference}`,
      metadata: { bookingId: booking.id },
    },
    expires_at: Math.floor(now / 1000) + CHECKOUT_MINUTES * 60 + 60,
    success_url: absoluteUrl(`/account/bookings/${booking.id}?session_id={CHECKOUT_SESSION_ID}`),
    cancel_url: absoluteUrl(`/account/bookings/${booking.id}`),
  });
  await db
    .update(bookings)
    .set({
      stripeCheckoutSessionId: session.id,
      holdExpiresAt: new Date(now + HOLD_MINUTES * 60_000),
      updatedAt: new Date(),
    })
    .where(and(eq(bookings.id, booking.id), eq(bookings.status, "pending_payment")));
  if (!session.url) {
    throw new Error("Stripe didn't return a checkout page.");
  }
  return session.url;
}

function idOf(value: string | { id: string } | null) {
  return typeof value === "string" ? value : (value?.id ?? null);
}

// Records a finished Stripe payment and confirms the booking. Safe to call more than once for
// the same payment (Stripe's webhook and the customer's return can both arrive): the payment is
// saved once, and only the first call gets `confirmedNow`, so the email goes out once.
export async function completeCheckout(
  sessionId: string,
): Promise<{ bookingId: string; confirmedNow: boolean } | null> {
  const session = await getStripe().checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent"],
  });
  const bookingId = session.metadata?.bookingId;
  const intent = session.payment_intent as Stripe.PaymentIntent | null;
  if (!bookingId || session.payment_status !== "paid" || !intent) {
    return null;
  }
  const paymentMethodId = idOf(intent.payment_method);

  const [confirmed] = (await atomic((tx) => [
    tx
      .update(bookings)
      .set({
        status: "confirmed",
        holdExpiresAt: null,
        stripePaymentMethodId: paymentMethodId,
        updatedAt: new Date(),
      })
      .where(and(eq(bookings.id, bookingId), eq(bookings.status, "pending_payment")))
      .returning({ id: bookings.id }),
    tx
      .insert(payments)
      .values({
        bookingId,
        kind: "payment",
        method: "stripe",
        amount: intent.amount_received,
        description: "Online payment",
        stripePaymentIntentId: intent.id,
      })
      .onConflictDoNothing(),
  ])) as [{ id: string }[]];

  if (confirmed.length > 0) {
    return { bookingId, confirmedNow: true };
  }
  // Paid for a booking that was cancelled in the meantime (for example by staff): give the
  // money back rather than keep it for a car the customer won't get.
  const [booking] = await db
    .select({ status: bookings.status })
    .from(bookings)
    .where(eq(bookings.id, bookingId));
  if (booking?.status === "cancelled") {
    await refundIfNotYet(bookingId, intent);
  }
  return { bookingId, confirmedNow: false };
}

async function refundIfNotYet(bookingId: string, intent: Stripe.PaymentIntent) {
  const refund = await getStripe().refunds.create(
    { payment_intent: intent.id },
    { idempotencyKey: `late-payment-refund-${intent.id}` },
  );
  await db
    .insert(payments)
    .values({
      bookingId,
      kind: "refund",
      method: "stripe",
      amount: refund.amount,
      description: "Refund: the booking was cancelled before the payment arrived",
      stripePaymentIntentId: intent.id,
      stripeRefundId: refund.id,
    })
    .onConflictDoNothing();
}

// Stripe closed the payment page without a payment: the car is let go right away.
export async function expireCheckout(bookingId: string) {
  await cancelBooking(bookingId, "The online payment wasn't completed in time.");
}
