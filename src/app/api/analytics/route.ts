import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/db";
import { bumpStat, fetchStats } from "@/lib/data";
import { clientIp, hitRateLimit, LIMITS } from "@/lib/rate-limit";
import { isAdminRole } from "@/lib/roles";

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
  // Count each visitor/event/profile at most a few times per hour, so
  // reach/share numbers can't be inflated by a loop. Excess hits are
  // accepted silently (no signal to the caller) but not counted.
  const limit = await hitRateLimit(
    getDb(),
    `stat:${clientIp(request.headers)}:${parsed.data.user_id}:${parsed.data.event}`,
    LIMITS.statPerVisitor.max,
    LIMITS.statPerVisitor.window
  );
  if (limit.ok) await bumpStat(parsed.data.user_id, parsed.data.event);
  return NextResponse.json({ ok: true });
}

/** Authenticated: read own (or, for admins, any user's) stats */
export async function GET(request: Request) {
  try {
    const profile = await requireUser();
    const requested = new URL(request.url).searchParams.get("user_id");
    const userId =
      isAdminRole(profile.role) && requested ? requested : profile.user_id;
    return NextResponse.json(await fetchStats(userId));
  } catch (err) {
    return errorResponse(err);
  }
}
