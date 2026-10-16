import { DEMO_ROLE_COOKIE, DEMO_SESSION_COOKIE } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/utils";
import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });

  if (isDemoMode()) {
    response.cookies.set(DEMO_SESSION_COOKIE, "", {
      httpOnly: true,
      path: "/",
      maxAge: 0,
    });
    response.cookies.set(DEMO_ROLE_COOKIE, "", {
      httpOnly: true,
      path: "/",
      maxAge: 0,
    });
    return response;
  }

  const supabase = createClient();
  if (supabase) await supabase.auth.signOut();
  return response;
}
