import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "@/db";
import { users } from "@/db/schema";
import { isReservedEmailDomain } from "@/lib/email-address";
import { requireEnv } from "@/lib/env";

let client: Stripe | null = null;

export function getStripe() {
  client ??= new Stripe(requireEnv("STRIPE_SECRET_KEY"));
  return client;
}

// Stripe uses lowercase currency codes and the same smallest unit as the app (cents, yen).
export function stripeCurrency(currency: string) {
  return currency.toLowerCase();
}

// The customer's Stripe customer, made at their first online payment. Saved cards belong to
// it, so the deposit and charges after the return can use the card from checkout.
export async function stripeCustomerFor(user: { id: string; name: string; email: string }) {
  const [saved] = await db
    .select({ stripeCustomerId: users.stripeCustomerId })
    .from(users)
    .where(eq(users.id, user.id));
  if (saved?.stripeCustomerId) {
    return saved.stripeCustomerId;
  }
  const customer = await getStripe().customers.create(
    {
      // Test addresses (like the demo's customer@demo.test) are left out: payment providers
      // may refuse them, and the customer types their own email on the payment page anyway.
      email: isReservedEmailDomain(user.email) ? undefined : user.email,
      name: user.name,
      metadata: { userId: user.id },
    },
    // Two payments started at once still make one Stripe customer.
    { idempotencyKey: `customer-${user.id}` },
  );
  await db.update(users).set({ stripeCustomerId: customer.id }).where(eq(users.id, user.id));
  return customer.id;
}
