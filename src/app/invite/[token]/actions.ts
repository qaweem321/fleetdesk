"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { atomic } from "@/db/atomic";
import { invitations, users } from "@/db/schema";
import { findValidInvitation } from "@/lib/invitations";
import { requireUser } from "@/lib/session";

export type AcceptState = { error?: string };

export async function acceptInvitation(
  _previous: AcceptState,
  formData: FormData,
): Promise<AcceptState> {
  const user = await requireUser();
  const invitation = await findValidInvitation(String(formData.get("token")));

  if (!invitation || invitation.email !== user.email.toLowerCase()) {
    return {
      error:
        "This invitation is no longer valid. It may have expired or been revoked. Ask for a new one.",
    };
  }

  await atomic((tx) => [
    tx.update(users).set({ role: invitation.role }).where(eq(users.id, user.id)),
    tx.delete(invitations).where(eq(invitations.id, invitation.id)),
  ]);
  redirect("/admin");
}
