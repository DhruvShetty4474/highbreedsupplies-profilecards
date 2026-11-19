import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { AuthError, requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { fetchSharePrefs } from "@/lib/data";
import { isAdminRole } from "@/lib/roles";

const bodySchema = z.object({
  user_id: z.string().min(1),
  offline: z.boolean().optional(),
  quick_share: z.enum(["text", "email"]).nullable().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await requireUser();
    const userId = new URL(request.url).searchParams.get("user_id") || session.user_id;
    if (!isAdminRole(session.role) && userId !== session.user_id) throw new AuthError(403);
    return NextResponse.json(await fetchSharePrefs(userId));
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireUser();
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    if (!isAdminRole(session.role) && parsed.data.user_id !== session.user_id) {
      throw new AuthError(403);
    }

    const patch: Partial<typeof schema.profiles.$inferInsert> = {};
    if (parsed.data.offline !== undefined) patch.share_offline = parsed.data.offline;
    if (parsed.data.quick_share !== undefined) patch.quick_share = parsed.data.quick_share;
    if (Object.keys(patch).length) {
      await getDb()
        .update(schema.profiles)
        .set(patch)
        .where(eq(schema.profiles.user_id, parsed.data.user_id));
    }

    return NextResponse.json({ ok: true, prefs: await fetchSharePrefs(parsed.data.user_id) });
  } catch (err) {
    return errorResponse(err);
  }
}
