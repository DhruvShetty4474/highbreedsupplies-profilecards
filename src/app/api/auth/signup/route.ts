import { createClient, createServiceClient } from "@/lib/supabase/server";
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
  const supabase = createClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 }
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid signup payload" }, { status: 400 });
  }

  const username = parsed.data.username.toLowerCase();

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
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
      email: parsed.data.email,
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

  return NextResponse.json({ ok: true });
}
