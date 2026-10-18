import { asc, inArray, ne } from "drizzle-orm";
import type { Metadata } from "next";
import { SubmitButton } from "@/components/ui/submit-button";
import { db } from "@/db";
import { invitations, users } from "@/db/schema";
import { formatDate } from "@/lib/format";
import { can, invitableRoles, roleLabels, staffRoles } from "@/lib/permissions";
import { requireStaff } from "@/lib/session";
import { requireSettings } from "@/lib/settings";
import { removeStaff, revokeInvitation, updateStaffRole } from "./actions";
import { InviteForm } from "./invite-form";

export const metadata: Metadata = { title: "Staff" };

const roleDescriptions = {
  agent: "Agents handle bookings, pickups and returns.",
  manager: "Managers also manage cars, prices and settings, and invite agents.",
  owner: "Owners can do everything, including managing staff.",
};

export default async function StaffPage() {
  const [me, settings] = await Promise.all([requireStaff(), requireSettings()]);
  const canManage = can(me.role, "staff:manage");
  const rolesICanInvite = invitableRoles(me.role);

  const [staff, pending] = await Promise.all([
    db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role })
      .from(users)
      .where(ne(users.role, "customer"))
      .orderBy(asc(users.name)),
    rolesICanInvite.length > 0
      ? db
          .select()
          .from(invitations)
          .where(inArray(invitations.role, rolesICanInvite))
          .orderBy(asc(invitations.createdAt))
      : Promise.resolve([]),
  ]);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">Staff</h1>
      <p className="mt-1 text-muted-foreground">People who work at {settings.businessName}.</p>
      <ul className="mt-3 space-y-0.5 text-sm text-subtle-foreground">
        {staffRoles.map((role) => (
          <li key={role}>{roleDescriptions[role]}</li>
        ))}
      </ul>

      {rolesICanInvite.length > 0 && <InviteForm roles={rolesICanInvite} />}

      <ul className="mt-8 divide-y divide-border rounded-xl border border-border">
        {staff.map((person) => {
          const isMe = person.id === me.id;
          return (
            <li key={person.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">
                  {person.name}{" "}
                  {isMe && <span className="text-sm text-subtle-foreground">(you)</span>}
                </p>
                <p className="text-sm text-subtle-foreground">{person.email}</p>
              </div>

              {canManage && !isMe ? (
                <div className="flex items-center gap-3">
                  <form
                    key={`${person.id}-${person.role}`}
                    action={updateStaffRole}
                    className="flex items-center gap-2"
                  >
                    <input type="hidden" name="userId" value={person.id} />
                    <select
                      name="role"
                      aria-label={`Role for ${person.name}`}
                      defaultValue={person.role}
                      className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                    >
                      {staffRoles.map((role) => (
                        <option key={role} value={role}>
                          {roleLabels[role]}
                        </option>
                      ))}
                    </select>
                    <SubmitButton
                      variant="link"
                      size="inline"
                      pendingText="Saving..."
                      aria-label={`Save role for ${person.name}`}
                    >
                      Save
                    </SubmitButton>
                  </form>
                  <form action={removeStaff}>
                    <input type="hidden" name="userId" value={person.id} />
                    <SubmitButton
                      variant="danger-link"
                      size="inline"
                      pendingText="Removing..."
                      confirm={`Remove ${person.name} from the staff? Their account stays, as a customer account.`}
                      aria-label={`Remove ${person.name}`}
                    >
                      Remove
                    </SubmitButton>
                  </form>
                </div>
              ) : (
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-secondary-foreground">
                  {roleLabels[person.role]}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {pending.length > 0 && (
        <>
          <h2 className="mt-10 text-lg font-semibold">Pending invitations</h2>
          <ul className="mt-4 divide-y divide-border rounded-xl border border-border">
            {pending.map((invitation) => {
              const expired = invitation.expiresAt < new Date();
              return (
                <li
                  key={invitation.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div>
                    <p className="font-medium">{invitation.email}</p>
                    <p className="text-sm text-subtle-foreground">
                      Invited as {roleLabels[invitation.role].toLowerCase()} ·{" "}
                      {expired ? (
                        <span className="text-danger">expired</span>
                      ) : (
                        `expires ${formatDate(invitation.expiresAt, settings.timeZone)}`
                      )}
                    </p>
                  </div>
                  <form action={revokeInvitation}>
                    <input type="hidden" name="invitationId" value={invitation.id} />
                    <SubmitButton
                      variant="danger-link"
                      size="inline"
                      pendingText="Revoking..."
                      confirm={`Revoke the invitation for ${invitation.email}?`}
                      aria-label={`Revoke invitation for ${invitation.email}`}
                    >
                      Revoke
                    </SubmitButton>
                  </form>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
