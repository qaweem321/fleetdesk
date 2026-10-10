import { eq } from "drizzle-orm";
import { db } from "@/db";
import { invitations } from "@/db/schema";

export const INVITE_DAYS = 7;

export async function findValidInvitation(token: string) {
  const [invitation] = await db.select().from(invitations).where(eq(invitations.token, token));
  if (!invitation || invitation.expiresAt < new Date()) {
    return null;
  }
  return invitation;
}
