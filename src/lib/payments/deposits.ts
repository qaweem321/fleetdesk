import { and, desc, eq } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "@/db";
import { bookings, payments, users } from "@/db/schema";
import { depositSettlementRows } from "./ledger";
import { getStripe, stripeCurrency } from "./stripe";

// The deposit: held at pickup, then charged in part (damage, fuel...) or let go at the return.
// With a card saved at online checkout, it's a hold on that card through Stripe (no money moves
// until it's charged). Otherwise staff take it at the counter and record it.

type Hold = { bookingId: string; amount: number; currency: string; staffId: string };

const DAY = 86_400_000;

// Stripe lets go of a card hold that isn't charged within about 7 days. So a hold is only
// offered when the car is due back within 6 days of handing it over; for longer rentals the
// deposit is taken at the counter.
export const CARD_HOLD_MAX_DAYS = 6;

export function cardHoldFits(returnAt: Date, now = new Date()) {
  return returnAt.getTime() - now.getTime() <= CARD_HOLD_MAX_DAYS * DAY;
}

// Holds the deposit on the card the customer paid with online. Returns a message when the bank
// wants the customer to confirm (or there's no saved card): then staff take it at the counter.
export async function holdDepositOnSavedCard({
  bookingId,
  amount,
  currency,
  staffId,
}: Hold): Promise<string | null> {
  const [found] = await db
    .select({ paymentMethodId: bookings.stripePaymentMethodId, customerId: users.stripeCustomerId })
    .from(bookings)
    .leftJoin(users, eq(users.id, bookings.customerId))
    .where(eq(bookings.id, bookingId));
  if (!found?.paymentMethodId || !found.customerId) {
    return "There's no saved card for this booking. Take the deposit at the counter.";
  }
  try {
    const intent = await getStripe().paymentIntents.create(
      {
        amount,
        currency: stripeCurrency(currency),
        customer: found.customerId,
        payment_method: found.paymentMethodId,
        capture_method: "manual",
        off_session: true,
        confirm: true,
        description: "Deposit",
        metadata: { bookingId, purpose: "deposit" },
      },
      { idempotencyKey: `deposit-${bookingId}` },
    );
    // A retried pickup gets the same hold back from Stripe (idempotency key): record it once.
    const [recorded] = await db
      .select({ id: payments.id })
      .from(payments)
      .where(and(eq(payments.bookingId, bookingId), eq(payments.stripePaymentIntentId, intent.id)))
      .limit(1);
    if (!recorded) {
      await db.insert(payments).values({
        bookingId,
        kind: "deposit_hold",
        method: "stripe",
        amount,
        description: "Deposit held on the card",
        stripePaymentIntentId: intent.id,
        createdById: staffId,
      });
    }
    return null;
  } catch (error) {
    if (error instanceof Stripe.errors.StripeCardError) {
      return `The card was declined for the deposit (${error.message}). Take the deposit at the counter.`;
    }
    throw error;
  }
}

// The open deposit hold on the card, if any.
async function openStripeHold(bookingId: string) {
  const [hold] = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.bookingId, bookingId),
        eq(payments.kind, "deposit_hold"),
        eq(payments.method, "stripe"),
      ),
    )
    .orderBy(desc(payments.createdAt))
    .limit(1);
  return hold ?? null;
}

// At the return: charge `amount` (0 to the held amount) from a held card deposit and let go of
// the rest. Returns what was charged, or null when there's no card hold (counter deposits are
// settled by staff and recorded on the Payments card). If the hold had already expired, nothing
// can be charged from it: it's recorded as let go, and what's owed shows as still to pay.
export async function settleCardDeposit(bookingId: string, amount: number, staffId: string) {
  const hold = await openStripeHold(bookingId);
  if (!hold?.stripePaymentIntentId) {
    return null;
  }
  const stripe = getStripe();
  const charge = Math.min(amount, hold.amount);
  try {
    // Capturing part of a hold lets go of the rest automatically.
    if (charge > 0) {
      await stripe.paymentIntents.capture(hold.stripePaymentIntentId, {
        amount_to_capture: charge,
      });
    } else {
      await stripe.paymentIntents.cancel(hold.stripePaymentIntentId);
    }
  } catch (error) {
    if (!(error instanceof Stripe.errors.StripeInvalidRequestError)) {
      throw error;
    }
    await recordRows(bookingId, staffId, hold.amount, 0, "The hold on the card had expired");
    return { charged: 0, holdExpired: true };
  }
  await recordRows(bookingId, staffId, hold.amount, charge, "Released on the card");
  return { charged: charge, holdExpired: false };
}

async function recordRows(
  bookingId: string,
  staffId: string,
  held: number,
  kept: number,
  givenBack: string,
) {
  await db.insert(payments).values(
    depositSettlementRows(held, kept, givenBack).map((row) => ({
      ...row,
      bookingId,
      method: "stripe" as const,
      createdById: staffId,
    })),
  );
}

// A pickup that failed after the deposit was held: let go of the hold, so it doesn't sit on the
// customer's card for days. The next try holds it again.
export async function releaseDepositHold(bookingId: string, staffId: string) {
  const hold = await openStripeHold(bookingId);
  if (!hold?.stripePaymentIntentId) {
    return;
  }
  await getStripe().paymentIntents.cancel(hold.stripePaymentIntentId);
  await recordRows(
    bookingId,
    staffId,
    hold.amount,
    0,
    "Released on the card (pickup not finished)",
  );
}

// Is the deposit held on the customer's card (rather than taken at the counter)?
export async function hasCardDeposit(bookingId: string) {
  return (await openStripeHold(bookingId)) !== null;
}
