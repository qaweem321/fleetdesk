import { APIError } from "better-auth/api";
import { isDemoMode } from "@/lib/demo";
import { rateLimit } from "@/lib/rate-limit";

const WINDOW_SECONDS = 15 * 60;
const MAX_ATTEMPTS = 20;

// Password logins per IP address (Better Auth's own default is 3 every 10 seconds, which still
// allows about 26,000 guesses a day).
export const loginRateRules = {
  "/sign-in/email": { window: WINDOW_SECONDS, max: MAX_ATTEMPTS },
};

// Password logins per account, so spreading guesses over many IP addresses doesn't help. Not in
// demo mode, where every visitor shares the same sample logins.
export async function checkLoginAttempts(path: string, body: unknown) {
  if (path !== "/sign-in/email" || isDemoMode()) {
    return;
  }
  const email = String((body as { email?: unknown } | undefined)?.email ?? "")
    .trim()
    .toLowerCase();
  if (!email) {
    return;
  }
  const { allowed } = await rateLimit(`login:${email}`, MAX_ATTEMPTS, WINDOW_SECONDS);
  if (!allowed) {
    throw new APIError("TOO_MANY_REQUESTS", {
      message: "Too many login attempts. Please wait 15 minutes, or reset your password.",
    });
  }
}
