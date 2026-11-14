import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { errorResponse } from "@/lib/api";
import { AuthError, requireUser } from "@/lib/auth";
import { fetchProfileById } from "@/lib/data";
import { collectGarbage, mediaLimits, MediaError, startUpload, usedBytes } from "@/lib/media";
import { getMediaStore } from "@/lib/r2";

const bodySchema = z.object({
  kind: z.enum(["avatar", "banner", "image", "video"]),
  content_type: z.string().min(3).max(100),
  size: z.number().int().positive(),
  /** Admins may upload on behalf of a customer (counts to their quota). */
  user_id: z.string().optional(),
});

function storeOr503() {
  const store = getMediaStore();
  if (!store) throw new MediaError(503, "Media storage is not configured");
  return store;
}

async function targetUser(requested: string | null | undefined) {
  const session = await requireUser();
  if (!requested || requested === session.user_id) return session.user_id;
  if (session.role !== "admin") throw new AuthError(403);
  return requested;
}

/** Quota usage for the dashboard. */
export async function GET(request: Request) {
  try {
    const userId = await targetUser(new URL(request.url).searchParams.get("user_id"));
    const limits = mediaLimits();
    return NextResponse.json({ used_bytes: await usedBytes(getDb(), userId), ...limits });
  } catch (err) {
    if (err instanceof MediaError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return errorResponse(err);
  }
}

/** Step 1: validate + reserve quota, return a presigned PUT URL. */
export async function POST(request: Request) {
  try {
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid upload request" }, { status: 400 });
    }
    const userId = await targetUser(parsed.data.user_id);
    const store = storeOr503();
    const db = getDb();

    await collectGarbage(db, store, userId, await fetchProfileById(userId));
    const upload = await startUpload(
      db,
      store,
      userId,
      parsed.data.kind,
      parsed.data.content_type,
      parsed.data.size
    );
    return NextResponse.json({ ok: true, ...upload });
  } catch (err) {
    if (err instanceof MediaError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return errorResponse(err);
  }
}
