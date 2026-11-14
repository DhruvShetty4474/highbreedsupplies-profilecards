/**
 * Media rules: allowed types, size limits, per-user quota, YouTube links,
 * and cleanup of R2 objects that are no longer referenced.
 */
import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import { getConfig } from "@/config";
import type { DB } from "@/db";
import * as schema from "@/db/schema";
import type { MediaStore } from "@/lib/r2";
import type { Profile } from "@/lib/types";
import { canonicalYouTubeUrl, parseYouTubeId } from "@/lib/youtube";

export { canonicalYouTubeUrl, parseYouTubeId, youTubeEmbedUrl } from "@/lib/youtube";

export type MediaKind = "avatar" | "banner" | "image" | "video";

export const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
export const VIDEO_TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
};

const MB = 1024 * 1024;
export const mediaLimits = () => {
  const c = getConfig();
  return {
    imageBytes: c.MEDIA_MAX_IMAGE_MB * MB,
    videoBytes: c.MEDIA_MAX_VIDEO_MB * MB,
    quotaBytes: c.MEDIA_QUOTA_MB_PER_USER * MB,
  };
};

export class MediaError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Validate kind/type/size; returns the file extension. */
export function checkUpload(kind: MediaKind, contentType: string, size: number) {
  const limits = mediaLimits();
  const isVideo = kind === "video";
  const ext = (isVideo ? VIDEO_TYPES : IMAGE_TYPES)[contentType];
  if (!ext) {
    throw new MediaError(
      415,
      isVideo ? "Videos must be MP4 or WebM" : "Images must be JPEG, PNG, WebP or GIF"
    );
  }
  const max = isVideo ? limits.videoBytes : limits.imageBytes;
  if (!Number.isInteger(size) || size <= 0) throw new MediaError(400, "Invalid file size");
  if (size > max) {
    throw new MediaError(413, `File too large (max ${Math.round(max / MB)} MB)`);
  }
  return ext;
}

export async function usedBytes(db: DB, userId: string) {
  const row = await db
    .select({ total: sql<number>`coalesce(sum(${schema.media.size}), 0)` })
    .from(schema.media)
    .where(eq(schema.media.user_id, userId))
    .get();
  return Number(row?.total ?? 0);
}

const keyId = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 16);

/** Reserve quota + create a pending row + presigned PUT URL. */
export async function startUpload(
  db: DB,
  store: MediaStore,
  userId: string,
  kind: MediaKind,
  contentType: string,
  size: number
) {
  const ext = checkUpload(kind, contentType, size);
  const { quotaBytes } = mediaLimits();
  if ((await usedBytes(db, userId)) + size > quotaBytes) {
    throw new MediaError(
      413,
      `Storage quota reached (${Math.round(quotaBytes / MB)} MB). Remove some media first.`
    );
  }

  const id = crypto.randomUUID();
  const key = `u/${userId}/${kind}/${keyId()}.${ext}`;
  const url = store.publicUrl(key);
  await db.insert(schema.media).values({
    id,
    user_id: userId,
    key,
    url,
    kind,
    content_type: contentType,
    size,
  });
  const uploadUrl = await store.presignPut(key, contentType);
  return { id, key, url, uploadUrl, headers: { "Content-Type": contentType } };
}

/** After the browser PUT: verify the real object, then mark ready. */
export async function completeUpload(
  db: DB,
  store: MediaStore,
  userId: string,
  mediaId: string
) {
  const row = await db
    .select()
    .from(schema.media)
    .where(and(eq(schema.media.id, mediaId), eq(schema.media.user_id, userId)))
    .get();
  if (!row) throw new MediaError(404, "Upload not found");
  if (row.status === "ready") return row;

  const head = await store.head(row.key);
  if (!head) throw new MediaError(400, "Upload did not reach storage — please retry");

  const reject = async (status: number, msg: string) => {
    await removeMedia(db, store, [row]);
    throw new MediaError(status, msg);
  };
  try {
    checkUpload(row.kind, head.contentType ?? "", head.size);
  } catch (e) {
    return reject(e instanceof MediaError ? e.status : 400, (e as Error).message);
  }
  // Real size may differ from the declared one; re-check the quota.
  const others = (await usedBytes(db, userId)) - row.size;
  if (others + head.size > mediaLimits().quotaBytes) {
    return reject(413, "Storage quota reached. Remove some media first.");
  }

  await db
    .update(schema.media)
    .set({ status: "ready", size: head.size })
    .where(eq(schema.media.id, row.id));
  return { ...row, status: "ready" as const, size: head.size };
}

type MediaRow = typeof schema.media.$inferSelect;

/** Delete objects from R2, then their rows (a failed R2 delete keeps the row). */
export async function removeMedia(db: DB, store: MediaStore, rows: MediaRow[]) {
  const done: string[] = [];
  for (const r of rows) {
    try {
      await store.delete(r.key);
      done.push(r.id);
    } catch (err) {
      console.error("R2 delete failed", r.key, err);
    }
  }
  if (done.length) {
    await db.delete(schema.media).where(inArray(schema.media.id, done));
  }
}

/** Every media URL a profile currently points at. */
export function referencedUrls(
  p: Pick<Profile, "avatar_url" | "banner_url" | "video_url" | "content_blocks">
) {
  const urls = new Set<string>();
  for (const u of [p.avatar_url, p.banner_url, p.video_url]) if (u) urls.add(u);
  for (const b of p.content_blocks ?? []) {
    if (b.url) urls.add(b.url);
    for (const u of b.urls ?? []) urls.add(u);
  }
  return urls;
}

/** Called after a profile save: delete media that was dropped or replaced. */
export async function deleteDereferenced(
  db: DB,
  store: MediaStore,
  userId: string,
  before: Set<string>,
  after: Set<string>
) {
  const gone = [...before].filter((u) => !after.has(u));
  if (!gone.length) return;
  const rows = await db
    .select()
    .from(schema.media)
    .where(and(eq(schema.media.user_id, userId), inArray(schema.media.url, gone)));
  await removeMedia(db, store, rows);
}

/**
 * Reclaim quota from uploads that never finished (pending > 1h) or were
 * uploaded but never saved to the profile (> 24h).
 */
export async function collectGarbage(
  db: DB,
  store: MediaStore,
  userId: string,
  profile: Profile | null
) {
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const stalePending = await db
    .select()
    .from(schema.media)
    .where(
      and(
        eq(schema.media.user_id, userId),
        eq(schema.media.status, "pending"),
        lt(schema.media.created_at, hourAgo)
      )
    );
  const refs = profile ? referencedUrls(profile) : new Set<string>();
  const orphans = (
    await db
      .select()
      .from(schema.media)
      .where(
        and(
          eq(schema.media.user_id, userId),
          eq(schema.media.status, "ready"),
          lt(schema.media.created_at, dayAgo)
        )
      )
  ).filter((r) => !refs.has(r.url));
  await removeMedia(db, store, [...stalePending, ...orphans]);
}

export function isOwnMediaUrl(url: string, publicBase: string) {
  return url.startsWith(`${publicBase.replace(/\/$/, "")}/`);
}

/**
 * Video must be a YouTube link (normalized) or one of our uploaded files.
 * Returns the value to store, or throws.
 */
export function normalizeVideoUrl(url: string, publicBase: string) {
  const id = parseYouTubeId(url);
  if (id) return canonicalYouTubeUrl(id);
  if (isOwnMediaUrl(url, publicBase) && /\.(mp4|webm)$/i.test(url)) return url;
  throw new MediaError(400, "Video must be a YouTube link or an uploaded MP4/WebM file");
}

/** Images: our uploads or any https URL. Blank → null. */
export function normalizeImageUrl(url: string | null | undefined) {
  const v = url?.trim();
  if (!v || v === "https://") return null;
  let u: URL;
  try {
    u = new URL(v);
  } catch {
    throw new MediaError(400, "Image links must be valid https:// URLs");
  }
  if (u.protocol !== "https:") throw new MediaError(400, "Image links must use https://");
  return u.toString();
}
