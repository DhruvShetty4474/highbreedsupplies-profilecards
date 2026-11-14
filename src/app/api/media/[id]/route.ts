import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { errorResponse } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { completeUpload, MediaError, removeMedia } from "@/lib/media";
import { getMediaStore } from "@/lib/r2";

type Params = { params: Promise<{ id: string }> };

async function ownerScope(id: string) {
  const session = await requireUser();
  const row = await getDb().select().from(schema.media).where(eq(schema.media.id, id)).get();
  if (!row || (row.user_id !== session.user_id && session.role !== "admin")) {
    throw new MediaError(404, "Media not found");
  }
  const store = getMediaStore();
  if (!store) throw new MediaError(503, "Media storage is not configured");
  return { row, store };
}

function fail(err: unknown) {
  if (err instanceof MediaError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  return errorResponse(err);
}

/** Step 2: the browser finished its PUT — verify and mark ready. */
export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { row, store } = await ownerScope(id);
    const done = await completeUpload(getDb(), store, row.user_id, id);
    return NextResponse.json({ ok: true, id: done.id, url: done.url, kind: done.kind });
  } catch (err) {
    return fail(err);
  }
}

/** Remove one media object (also clears it from avatar/banner/video). */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { row, store } = await ownerScope(id);
    const db = getDb();
    for (const col of ["avatar_url", "banner_url", "video_url"] as const) {
      await db
        .update(schema.profiles)
        .set({ [col]: null })
        .where(and(eq(schema.profiles.user_id, row.user_id), eq(schema.profiles[col], row.url)));
    }
    await removeMedia(db, store, [row]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
