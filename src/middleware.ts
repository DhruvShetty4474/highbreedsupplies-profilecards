import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Fast redirect for signed-out visitors. This only checks that a session
 * cookie EXISTS — real session + role checks happen server-side in the
 * admin/dashboard layouts and every API route.
 */
export function middleware(request: NextRequest) {
  if (!getSessionCookie(request)) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/manager/:path*", "/invoice/:path*"],
};
