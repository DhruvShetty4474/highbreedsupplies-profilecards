import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { DEMO_ROLE_COOKIE, DEMO_SESSION_COOKIE } from "@/lib/auth";
import { isDemoMode } from "@/lib/utils";

const protectedPrefixes = ["/dashboard", "/admin"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = await updateSession(request);

  const needsAuth = protectedPrefixes.some((p) => pathname.startsWith(p));
  if (!needsAuth) return response;

  if (isDemoMode()) {
    const userId = request.cookies.get(DEMO_SESSION_COOKIE)?.value;
    const role = request.cookies.get(DEMO_ROLE_COOKIE)?.value;
    if (!userId || !role) {
      const login = new URL("/login", request.url);
      login.searchParams.set("next", pathname);
      return NextResponse.redirect(login);
    }
    if (pathname.startsWith("/admin") && role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return response;
  }

  const hasSession =
    request.cookies.getAll().some((c) => c.name.includes("auth-token")) ||
    request.cookies.getAll().some((c) => c.name.startsWith("sb-"));

  if (!hasSession) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
