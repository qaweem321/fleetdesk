type Env = Record<string, string | undefined>;
type PaymentOptions = "pay_at_pickup" | "online" | "both";
export type PaymentMethod = "pay_at_pickup" | "online";

// Online payments need a Stripe key. Without one, everything is paid at pickup, whatever
// Settings say.
export function stripeConfigured(env: Env = process.env) {
  return Boolean(env.STRIPE_SECRET_KEY);
}

// The ways a customer can pay right now, the first one being the default.
export function paymentMethodsFor(
  options: PaymentOptions,
  env: Env = process.env,
): PaymentMethod[] {
  if (!stripeConfigured(env) || options === "pay_at_pickup") {
    return ["pay_at_pickup"];
  }
  return options === "online" ? ["online"] : ["online", "pay_at_pickup"];
}

// How long an unpaid online booking keeps the car. Stripe's checkout page can't close sooner
// than 30 minutes; a few minutes extra means a payment can never arrive after the car is let go.
export const CHECKOUT_MINUTES = 30;
export const HOLD_MINUTES = 35;
