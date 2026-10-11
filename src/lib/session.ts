import { getSessionCookie } from "better-auth/cookies";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";
import { can, isStaff, type Permission, type Role, type StaffRole } from "@/lib/permissions";

// Where someone lands after logging in: staff in the admin area, customers in their account.
export function homePath(role: Role) {
  return isStaff(role) ? "/admin" : "/account";
}

async function readSession() {
  const requestHeaders = await headers();
  return { requestHeaders, session: await auth.api.getSession({ headers: requestHeaders }) };
}

// The logged-in user, or null. For public pages that look different when logged in.
// Visitors without a login cookie skip the database check entirely.
export const getOptionalUser = cache(async () => {
  const requestHeaders = await headers();
  if (!getSessionCookie(requestHeaders)) {
    return null;
  }
  const session = await auth.api.getSession({ headers: requestHeaders });
  return session ? { ...session.user, role: session.user.role as Role } : null;
});

export const requireUser = cache(async () => {
  const { requestHeaders, session } = await readSession();
  if (!session) {
    // Session expired: log in again, then come back to the same page (set by src/proxy.ts).
    const path = requestHeaders.get("x-pathname");
    redirect(path ? `/login?next=${encodeURIComponent(path)}` : "/login");
  }
  return { ...session.user, role: session.user.role as Role };
});

// For the login, signup and forgot-password pages: logged-in users go to their home page.
export async function redirectIfLoggedIn() {
  const user = await getOptionalUser();
  if (user) {
    redirect(homePath(user.role));
  }
}

// Every admin page and staff action starts with this. Customers get a 404, so the admin area
// doesn't even show that it exists. Staff without the permission get the same "doesn't exist,
// or you don't have access" page (their menu never links there).
export const requireStaff = cache(async (permission?: Permission) => {
  const user = await requireUser();
  if (!isStaff(user.role)) {
    notFound();
  }
  if (permission && !can(user.role, permission)) {
    notFound();
  }
  return { ...user, role: user.role as StaffRole };
});
