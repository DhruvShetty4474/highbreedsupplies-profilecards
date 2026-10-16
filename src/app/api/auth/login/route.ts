import {
  DEMO_ROLE_COOKIE,
  DEMO_SESSION_COOKIE,
} from "@/lib/auth";
import { findAccountByLogin } from "@/lib/demo-store";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/utils";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  login_id: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter login ID and password" }, { status: 400 });
  }

  if (isDemoMode()) {
    const account = findAccountByLogin(parsed.data.login_id);
    if (!account || account.password !== parsed.data.password) {
      return NextResponse.json(
        { error: "Invalid login ID or password" },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      ok: true,
      role: account.profile.role,
      username: account.profile.username,
    });

    response.cookies.set(DEMO_SESSION_COOKIE, account.user_id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    response.cookies.set(DEMO_ROLE_COOKIE, account.profile.role, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  }

  const supabase = createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Auth is not configured" }, { status: 503 });
  }

  const email = parsed.data.login_id.includes("@")
    ? parsed.data.login_id
    : `${parsed.data.login_id}@highbreed.local`;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, username")
    .eq("user_id", user?.id)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    role: profile?.role ?? "client",
    username: profile?.username,
  });
}
