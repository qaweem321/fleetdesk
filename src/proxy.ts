import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

// Runs before private pages render. Visitors without a login cookie go to the login page,
// which sends them back here after they log in. This is a fast cookie check only; the
// real session check still happens in requireUser().
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname + request.nextUrl.search;

  if (!getSessionCookie(request)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", path);
    return NextResponse.redirect(loginUrl);
  }

  // Tell the page which URL was requested, so requireUser() can send an expired session
  // back to the same page after logging in again.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", path);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/dashboard", "/admin/:path*", "/account/:path*", "/book"],
};
