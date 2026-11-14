"use client";

export type UploadKind = "avatar" | "banner" | "image" | "video";

const MAX_DIM: Record<Exclude<UploadKind, "video">, number> = {
  avatar: 800,
  banner: 2000,
  image: 1800,
};

/**
 * Downscale + re-encode an image in the browser (WebP, JPEG fallback).
 * GIFs are left alone to keep animation. Returns the original if the
 * result would not be smaller.
 */
export async function compressImage(file: File, kind: Exclude<UploadKind, "video">) {
  if (file.type === "image/gif" || typeof createImageBitmap !== "function") return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }
  const max = MAX_DIM[kind];
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const toBlob = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
  let blob = await toBlob("image/webp");
  if (!blob || blob.type !== "image/webp") blob = await toBlob("image/jpeg");
  if (!blob || blob.size >= file.size) return file;

  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + "." + ext, { type: blob.type });
}

async function json<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

/** presign → direct PUT to R2 → server verification. Returns the public URL. */
export async function uploadMedia(
  original: File,
  kind: UploadKind,
  forUserId?: string
): Promise<string> {
  const file = kind === "video" ? original : await compressImage(original, kind);

  const start = await json<{ id: string; uploadUrl: string; url: string; headers: Record<string, string> }>(
    await fetch("/api/media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        content_type: file.type,
        size: file.size,
        user_id: forUserId,
      }),
    })
  );

  const put = await fetch(start.uploadUrl, {
    method: "PUT",
    headers: start.headers,
    body: file,
  });
  if (!put.ok) throw new Error(`Upload to storage failed (${put.status})`);

  const done = await json<{ url: string }>(
    await fetch(`/api/media/${start.id}`, { method: "POST" })
  );
  return done.url;
}
