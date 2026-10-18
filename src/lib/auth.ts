import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { accountDeletionBlockers } from "@/lib/account";
import { buttonEmailHtml, sendEmail } from "@/lib/email";
import { checkLoginAttempts, loginRateRules } from "@/lib/login-limit";
import { cleanUserName } from "@/lib/user-name";

// Names are checked here, on the server, for signup and for changes on the Account page.
function checkedName(value: unknown) {
  const checked = cleanUserName(value);
  if ("error" in checked) {
    throw new APIError("BAD_REQUEST", { message: checked.error });
  }
  return checked.name;
}

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
    requireEmailVerification: true,
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
    sendOnSignUp: true,
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
    before: createAuthMiddleware(async (ctx) => {
      await checkLoginAttempts(ctx.path, ctx.body);
    }),
  },
  // Limits login attempts and email sending per IP (on in production only).
  // Stored in the database because serverless instances don't share memory.
  databaseHooks: {
    user: {
      create: {
        before: async (user) => ({ data: { ...user, name: checkedName(user.name) } }),
      },
      update: {
        before: async (user) =>
          "name" in user ? { data: { ...user, name: checkedName(user.name) } } : undefined,
      },
    },
  },
  rateLimit: { storage: "database", customRules: loginRateRules },
  plugins: [nextCookies()],
});
