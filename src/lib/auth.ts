import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { accountDeletionBlockers } from "@/lib/account";
import { DEMO_DISABLED_MESSAGE, isDemoLogin, isDemoMode } from "@/lib/demo";
import { buttonEmailHtml, sendEmail } from "@/lib/email";

// Account changes that would lock other demo visitors out of the shared sample logins.
const PROTECTED_DEMO_PATHS = ["/change-password", "/delete-user", "/change-email", "/update-user"];

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema, usePlural: true }),
  user: {
    additionalFields: {
      // "customer", "agent", "manager" or "owner". input: false means sign-up can't set it.
      role: { type: "string", required: false, defaultValue: "customer", input: false },
    },
    // "Delete account" on the Account page. Needs the user's password.
    // Sessions are removed automatically (ON DELETE CASCADE).
    deleteUser: {
      enabled: true,
      beforeDelete: async (user) => {
        const blockers = await accountDeletionBlockers(user.id);
        if (blockers.length > 0) {
          throw new APIError("BAD_REQUEST", { message: blockers.join(" ") });
        }
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    // In demo mode no emails go out, so people get in without verifying.
    requireEmailVerification: !isDemoMode(),
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      try {
        await sendEmail({
          to: user.email,
          subject: "Reset your password",
          text: `Hi ${user.name},\n\nClick the link below to choose a new password:\n${url}\n\nThis link expires in 1 hour. If you didn't ask for this, you can ignore this email.`,
          html: buttonEmailHtml({
            heading: "Reset your password",
            message: `Hi ${user.name}, click the button below to choose a new password.`,
            buttonText: "Reset password",
            url,
            footer:
              "This link expires in 1 hour. If you didn't ask for this, you can ignore this email.",
          }),
        });
      } catch (error) {
        console.error(error);
      }
    },
  },
  emailVerification: {
    sendOnSignUp: !isDemoMode(),
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      try {
        await sendEmail({
          to: user.email,
          subject: "Verify your email",
          text: `Hi ${user.name},\n\nPlease confirm your email address:\n${url}\n\nIf you didn't create an account, you can ignore this email.`,
          html: buttonEmailHtml({
            heading: "Verify your email",
            message: `Hi ${user.name}, please confirm your email address to finish creating your account.`,
            buttonText: "Verify email",
            url,
            footer: "If you didn't create an account, you can ignore this email.",
          }),
        });
      } catch (error) {
        console.error(error);
      }
    },
  },
  hooks: {
    // In the live demo, the shared sample logins can't be locked or deleted by a visitor.
    before: createAuthMiddleware(async (ctx) => {
      if (!PROTECTED_DEMO_PATHS.includes(ctx.path)) {
        return;
      }
      const session = await getSessionFromCtx(ctx);
      if (session && isDemoLogin(session.user.email)) {
        throw new APIError("FORBIDDEN", { message: DEMO_DISABLED_MESSAGE });
      }
    }),
  },
  // Limits login attempts and email sending per IP (on in production only).
  // Stored in the database because serverless instances don't share memory.
  rateLimit: { storage: "database" },
  plugins: [nextCookies()],
});
