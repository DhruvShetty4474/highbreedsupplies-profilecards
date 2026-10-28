import {
  DEMO_ROLE_COOKIE,
  DEMO_SESSION_COOKIE,
} from "@/lib/auth";
import { demoCards, getDemoCardByToken } from "@/lib/demo-data";
import { createDemoCustomer } from "@/lib/demo-store";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/utils";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(2),
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-z0-9_]+$/i),
  card_token: z.string().optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a valid name, username, email, and password (6+ chars)" },
      { status: 400 }
    );
  }

  const username = parsed.data.username.toLowerCase();
  const email = parsed.data.email.trim().toLowerCase();

  if (isDemoMode()) {
    try {
      const created = createDemoCustomer({
        login_id: email,
        password: parsed.data.password,
        username,
        full_name: parsed.data.full_name,
        email,
      });

      if (parsed.data.card_token) {
        const card = getDemoCardByToken(parsed.data.card_token);
        if (card?.status === "UNCLAIMED") {
          const idx = demoCards.findIndex(
            (c) => c.public_token === parsed.data.card_token
          );
          if (idx >= 0) {
            demoCards[idx] = {
              ...demoCards[idx],
              status: "ACTIVE",
              user_id: created.user_id,
              activated_at: new Date().toISOString(),
            };
          }
        }
      }

      const response = NextResponse.json({
        ok: true,
        role: "client",
        username: created.profile.username,
      });

      response.cookies.set(DEMO_SESSION_COOKIE, created.user_id, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
      response.cookies.set(DEMO_ROLE_COOKIE, "client", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });

      return response;
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Signup failed" },
        { status: 400 }
      );
    }
  }

  const supabase = createClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 }
    );
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.full_name,
        username,
        role: "client",
      },
    },
  });

  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message || "Signup failed" },
      { status: 400 }
    );
  }

  await supabase
    .from("profiles")
    .update({
      username,
      full_name: parsed.data.full_name,
      email,
    })
    .eq("user_id", data.user.id);

  if (parsed.data.card_token) {
    const service = createServiceClient() ?? supabase;
    await service
      .from("cards")
      .update({
        status: "ACTIVE",
        user_id: data.user.id,
        activated_at: new Date().toISOString(),
      })
      .eq("public_token", parsed.data.card_token)
      .eq("status", "UNCLAIMED");
  }

  return NextResponse.json({ ok: true, role: "client", username });
}
