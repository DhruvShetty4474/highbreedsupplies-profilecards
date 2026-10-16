import { getSessionProfile } from "@/lib/auth";
import { demoCards, getDemoCardByToken } from "@/lib/demo-data";
import { createServiceClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/utils";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  public_token: z.string().min(6),
});

export async function POST(request: Request) {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  if (isDemoMode()) {
    const card = getDemoCardByToken(parsed.data.public_token);
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }
    if (card.status === "BLOCKED") {
      return NextResponse.json({ error: "Card is blocked" }, { status: 403 });
    }
    if (card.status === "ACTIVE" && card.user_id !== profile.user_id) {
      return NextResponse.json({ error: "Card already claimed" }, { status: 409 });
    }
    const idx = demoCards.findIndex((c) => c.public_token === parsed.data.public_token);
    if (idx >= 0) {
      demoCards[idx] = {
        ...demoCards[idx],
        status: "ACTIVE",
        user_id: profile.user_id,
        activated_at: new Date().toISOString(),
      };
    }
    return NextResponse.json({
      ok: true,
      username: profile.username,
      redirect: `/${profile.username}`,
    });
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const { data: card } = await supabase
    .from("cards")
    .select("*")
    .eq("public_token", parsed.data.public_token)
    .maybeSingle();

  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }
  if (card.status === "BLOCKED") {
    return NextResponse.json({ error: "Card is blocked" }, { status: 403 });
  }
  if (card.status === "ACTIVE" && card.user_id !== profile.user_id) {
    return NextResponse.json({ error: "Card already claimed" }, { status: 409 });
  }

  const { error } = await supabase
    .from("cards")
    .update({
      status: "ACTIVE",
      user_id: profile.user_id,
      activated_at: new Date().toISOString(),
    })
    .eq("public_token", parsed.data.public_token);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    username: profile.username,
    redirect: `/${profile.username}`,
  });
}
