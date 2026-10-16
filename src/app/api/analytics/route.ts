import { bumpStat, getStats } from "@/lib/demo-store";
import { getSessionProfile } from "@/lib/auth";
import { isDemoMode } from "@/lib/utils";
import { NextResponse } from "next/server";
import { z } from "zod";

const eventSchema = z.object({
  user_id: z.string().min(1),
  event: z.enum(["reach", "share", "contact_save"]),
});

/** Public: record profile reach / share / save events */
export async function POST(request: Request) {
  const parsed = eventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  if (!isDemoMode()) {
    return NextResponse.json({ ok: true, recorded: false });
  }

  const field =
    parsed.data.event === "reach"
      ? "reaches"
      : parsed.data.event === "share"
        ? "shares"
        : "contact_saves";

  const stats = bumpStat(parsed.data.user_id, field);
  return NextResponse.json({ ok: true, stats });
}

/** Authenticated: read own (or admin) stats */
export async function GET(request: Request) {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const userId =
    profile.role === "admin" && searchParams.get("user_id")
      ? searchParams.get("user_id")!
      : profile.user_id;

  if (!isDemoMode()) {
    return NextResponse.json({
      reaches: 0,
      shares: 0,
      contact_saves: 0,
      leads: 0,
    });
  }

  const stats = getStats(userId);
  return NextResponse.json(stats);
}
