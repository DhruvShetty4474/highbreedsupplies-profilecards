import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { bumpStat, fetchStats } from "@/lib/data";

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
  await bumpStat(parsed.data.user_id, parsed.data.event);
  return NextResponse.json({ ok: true });
}

/** Authenticated: read own (or, for admins, any user's) stats */
export async function GET(request: Request) {
  try {
    const profile = await requireUser();
    const requested = new URL(request.url).searchParams.get("user_id");
    const userId =
      profile.role === "admin" && requested ? requested : profile.user_id;
    return NextResponse.json(await fetchStats(userId));
  } catch (err) {
    return errorResponse(err);
  }
}
