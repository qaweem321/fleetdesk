import { eq } from "drizzle-orm";
import { absoluteUrl } from "@/config/site";
import { db } from "@/db";
import { driverProfiles } from "@/db/schema";
import { stripeConfigured } from "@/lib/payments/options";
import { getStripe } from "@/lib/payments/stripe";
import type { BusinessSettings } from "@/lib/settings";

// Stripe Identity: the customer photographs their license and takes a selfie; Stripe checks the
// license is real and the face matches. Optional (Settings), because Stripe charges per check.

export function identityCheckAvailable(settings: BusinessSettings) {
  return stripeConfigured() && settings.stripeIdentityEnabled;
}

// Opens Stripe's identity check for a customer and remembers it on their driver profile.
export async function startIdentityCheck(userId: string) {
  const session = await getStripe().identity.verificationSessions.create({
    type: "document",
    options: {
      document: {
        allowed_types: ["driving_license"],
        require_live_capture: true,
        require_matching_selfie: true,
      },
    },
    metadata: { userId },
    return_url: absoluteUrl("/account/driver?identity=done"),
  });
  await db
    .insert(driverProfiles)
    .values({ userId, stripeVerificationSessionId: session.id })
    .onConflictDoUpdate({
      target: driverProfiles.userId,
      set: { stripeVerificationSessionId: session.id, updatedAt: new Date() },
    });
  if (!session.url) {
    throw new Error("Stripe didn't return an identity check page.");
  }
  return session.url;
}

// Stripe confirmed the identity: the driver is approved, no staff review needed.
export async function identityVerified(sessionId: string) {
  const now = new Date();
  await db
    .update(driverProfiles)
    .set({
      status: "approved",
      verifiedBy: "stripe_identity",
      reviewNote: null,
      reviewedById: null,
      reviewedAt: now,
      submittedAt: now,
      updatedAt: now,
    })
    .where(eq(driverProfiles.stripeVerificationSessionId, sessionId));
}

// The automatic check couldn't confirm the identity (blurry photo, different face...). The
// customer can try again or send their license photos for staff to check.
export async function identityNeedsInput(sessionId: string, reason: string | null) {
  await db
    .update(driverProfiles)
    .set({
      reviewNote: `The automatic check didn't succeed${reason ? ` (${reason})` : ""}. Please try again or send your license photos below.`,
      updatedAt: new Date(),
    })
    .where(eq(driverProfiles.stripeVerificationSessionId, sessionId));
}
