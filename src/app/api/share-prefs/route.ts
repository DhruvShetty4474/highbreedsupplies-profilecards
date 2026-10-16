import { getSessionProfile } from "@/lib/auth";
import { getSharePrefs, updateSharePrefs } from "@/lib/share-prefs";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  user_id: z.string().min(1),
  offline: z.boolean().optional(),
  quick_share: z.enum(["text", "email"]).nullable().optional(),
});

export async function GET(request: Request) {
  const session = await getSessionProfile();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const userId = new URL(request.url).searchParams.get("user_id") || session.user_id;
  if (session.role !== "admin" && userId !== session.user_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(getSharePrefs(userId));
}

export async function PATCH(request: Request) {
  const session = await getSessionProfile();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (session.role !== "admin" && parsed.data.user_id !== session.user_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const next = updateSharePrefs(parsed.data.user_id, {
    offline: parsed.data.offline,
    quick_share: parsed.data.quick_share,
  });

  return NextResponse.json({ ok: true, prefs: next });
}
