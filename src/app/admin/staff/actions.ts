"use server";

import { randomBytes } from "node:crypto";
import { and, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { absoluteUrl } from "@/config/site";
import { db } from "@/db";
import { invitations, users } from "@/db/schema";
import { buttonEmailHtml, sendEmail } from "@/lib/email";
import { isValidEmail } from "@/lib/email-address";
import { INVITE_DAYS } from "@/lib/invitations";
import { invitableRoles, isStaffRole, roleLabels } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { requireStaff } from "@/lib/session";
import { requireSettings } from "@/lib/settings";
import { isUuid } from "@/lib/uuid";

const STAFF_PATH = "/admin/staff";

// A staff member other than yourself. Customers can't be targeted from this page.
async function findOtherStaff(userId: string, myId: string) {
  if (userId === myId) {
    throw new Error("You can't change your own access.");
  }
  const [target] = await db
    .select({ id: users.id, role: users.role, email: users.email })
    .from(users)
    .where(and(eq(users.id, userId), ne(users.role, "customer")));
  if (!target) {
    throw new Error("Staff member not found.");
  }
  return target;
}

export async function updateStaffRole(formData: FormData) {
  const me = await requireStaff("staff:manage");
  const role = String(formData.get("role"));
  if (!isStaffRole(role)) {
    throw new Error("Invalid role.");
  }
  const target = await findOtherStaff(String(formData.get("userId")), me.id);
  await db.update(users).set({ role }).where(eq(users.id, target.id));
  revalidatePath(STAFF_PATH);
}

// Removing someone from the staff keeps their account (and any bookings) as a customer.
export async function removeStaff(formData: FormData) {
  const me = await requireStaff("staff:manage");
  const target = await findOtherStaff(String(formData.get("userId")), me.id);
  await db.update(users).set({ role: "customer" }).where(eq(users.id, target.id));
  revalidatePath(STAFF_PATH);
}

export type InviteState = {
  error?: string;
  success?: string;
  email?: string;
};

export async function inviteStaff(
  _previous: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const [me, settings] = await Promise.all([requireStaff("staff:invite"), requireSettings()]);
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const role = String(formData.get("role"));

  if (!isValidEmail(email)) {
    return { error: "Please enter a valid email address.", email };
  }
  if (!isStaffRole(role) || !invitableRoles(me.role).includes(role)) {
    return { error: "Please choose a role you're allowed to give.", email };
  }

  const [existing] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.email, email));
  if (existing && existing.role !== "customer") {
    return { error: "That person is already on the staff.", email };
  }

  // Stop the app being used to send spam: at most 20 invitation emails per hour.
  const { allowed } = await rateLimit("staff-invite", 20, 60 * 60);
  if (!allowed) {
    return { error: "Too many invitations sent. Please try again in an hour.", email };
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000);
  await db
    .insert(invitations)
    .values({ email, role, token, invitedById: me.id, expiresAt })
    .onConflictDoUpdate({
      target: invitations.email,
      set: { role, token, invitedById: me.id, expiresAt },
    });
  revalidatePath(STAFF_PATH);

  const link = absoluteUrl(`/invite/${token}`);
  const roleName = roleLabels[role].toLowerCase();
  try {
    await sendEmail({
      to: email,
      subject: `${me.name} invited you to join ${settings.businessName}`,
      text: `${me.name} invited you to join the ${settings.businessName} team as ${roleName}.\n\nAccept the invitation: ${link}\n\nThis link expires in ${INVITE_DAYS} days.`,
      html: buttonEmailHtml({
        heading: `Join ${settings.businessName}`,
        message: `${me.name} invited you to join the ${settings.businessName} team as ${roleName}.`,
        buttonText: "Accept invitation",
        url: link,
        footer: `This link expires in ${INVITE_DAYS} days.`,
      }),
    });
  } catch (error) {
    console.error(error);
    return { error: `Invitation saved, but the email to ${email} could not be sent.`, email };
  }
  return { success: `Invitation sent to ${email}.` };
}

// Like inviting: managers can only revoke invitations they could have sent (agents).
export async function revokeInvitation(formData: FormData) {
  const me = await requireStaff("staff:invite");
  const id = String(formData.get("invitationId"));
  if (!isUuid(id)) {
    throw new Error("Invitation not found.");
  }
  await db
    .delete(invitations)
    .where(and(eq(invitations.id, id), inArray(invitations.role, invitableRoles(me.role))));
  revalidatePath(STAFF_PATH);
}
