// Sample logins created by `npm run db:seed`, so both sides can be tried: the admin area
// (owner, agent) and a customer's account.
export const SAMPLE_PASSWORD = "fleetdesk-demo";
export const sampleLogins = {
  owner: { name: "Olivia Owner", email: "owner@demo.test" },
  agent: { name: "Adam Agent", email: "agent@demo.test" },
  customer: { name: "Chris Customer", email: "customer@demo.test" },
} as const;
