import { isDemoMode } from "./demo";
import { isStorageDriverName } from "./storage/driver-name";

type Env = Record<string, string | undefined>;

// Returns a list of problems with the environment variables. An empty list means all good.
export function checkEnv(env: Env = process.env) {
  const problems: string[] = [];
  const isProduction = env.NODE_ENV === "production";

  function required(name: string) {
    if (!env[name]) {
      problems.push(`${name} is missing.`);
    }
  }

  required("DATABASE_URL");
  required("BETTER_AUTH_SECRET");
  required("BETTER_AUTH_URL");

  const secret = env.BETTER_AUTH_SECRET;
  if (secret && secret.length < 32) {
    problems.push("BETTER_AUTH_SECRET must be at least 32 characters long.");
  }

  const url = env.BETTER_AUTH_URL;
  if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
    problems.push(
      `BETTER_AUTH_URL "${url}" must start with http:// or https:// (example: http://localhost:3000).`,
    );
  } else if (url?.endsWith("/")) {
    problems.push("BETTER_AUTH_URL must not end with a slash.");
  }

  const demo = env.DEMO_MODE;
  if (demo && demo !== "true" && demo !== "false") {
    problems.push(`DEMO_MODE must be "true" or "false", not "${demo}".`);
  }

  // Without Resend, emails are only printed to the terminal, so nobody could verify their email.
  // Demo mode sends no emails and skips verification, so it doesn't need Resend.
  if (isProduction && !isDemoMode(env)) {
    required("RESEND_API_KEY");
  }

  const storage = env.STORAGE_DRIVER;
  if (storage && !isStorageDriverName(storage)) {
    problems.push(
      `STORAGE_DRIVER must be "database", "local" or "s3" (or empty), not "${storage}".`,
    );
  }
  // Vercel's disk is wiped on every deploy, so uploads saved there would disappear.
  if (storage === "local" && env.VERCEL) {
    problems.push(`STORAGE_DRIVER "local" doesn't work on Vercel. Use "database" or "s3".`);
  }
  if (storage === "s3") {
    for (const name of ["S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"]) {
      required(name);
    }
  }

  // Online payments: the webhook secret is how Stripe proves a payment really happened.
  if (env.STRIPE_SECRET_KEY && isProduction) {
    required("STRIPE_WEBHOOK_SECRET");
  }
  if (env.STRIPE_SECRET_KEY && !/^(sk|rk)_(test|live)_/.test(env.STRIPE_SECRET_KEY)) {
    problems.push("STRIPE_SECRET_KEY should start with sk_test_ or sk_live_.");
  }

  // The daily reminder job is protected by this secret.
  if (isProduction) {
    required("CRON_SECRET");
  }
  if (env.CRON_SECRET && env.CRON_SECRET.length < 16) {
    problems.push("CRON_SECRET must be at least 16 characters long.");
  }

  const driver = env.DATABASE_DRIVER;
  if (driver && driver !== "neon" && driver !== "postgres") {
    problems.push(`DATABASE_DRIVER must be "neon" or "postgres" (or empty), not "${driver}".`);
  }

  return problems;
}

export function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. See .env.example.`);
  }
  return value;
}
