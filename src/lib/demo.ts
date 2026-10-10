type Env = Record<string, string | undefined>;

// Demo mode is for a public demo without a verified email domain: sign-up skips email
// verification, no emails are sent and a banner explains it. Off unless DEMO_MODE="true".
export function isDemoMode(env: Env = process.env) {
  return env.DEMO_MODE === "true";
}

// Card details that work in Stripe's test mode (no real money).
export const demoTestCard = { number: "4242 4242 4242 4242", expiry: "12/34", cvc: "123" };

// Sample logins created by `npm run db:seed`, shown on the demo banner so visitors can try
// both sides: the admin area (owner, agent) and a customer's account.
export const DEMO_PASSWORD = "fleetdesk-demo";
export const demoLogins = {
  owner: { name: "Olivia Owner", email: "owner@demo.test" },
  agent: { name: "Adam Agent", email: "agent@demo.test" },
  customer: { name: "Chris Customer", email: "customer@demo.test" },
} as const;

export const DEMO_DISABLED_MESSAGE = "This is turned off in the live demo.";
