import { beforeEach, describe, expect, it } from "vitest";
import { POST as presignRoute } from "@/app/api/media/route";
import { DELETE as deleteRoute, POST as completeRoute } from "@/app/api/media/[id]/route";
import { PATCH as profilePatch } from "@/app/api/profile/route";
import type { DB } from "@/db";
import {
  checkUpload,
  completeUpload,
  MediaError,
  normalizeVideoUrl,
  parseYouTubeId,
  startUpload,
  usedBytes,
} from "@/lib/media";
import { setMediaStoreForTesting, type MediaStore } from "@/lib/r2";
import { freshDb, schema } from "./helpers/db";
import { params, req, signOutBrowser, testIp } from "./helpers/next";
import { registerUser, userIdFor } from "./helpers/users";

const MB = 1024 * 1024;

/** In-memory R2: tests decide what "the browser uploaded". */
function fakeStore() {
  const objects = new Map<string, { size: number; contentType: string }>();
  const deleted: string[] = [];
  const store: MediaStore = {
    presignPut: async (key) => `https://r2.test/${key}?sig=1`,
    head: async (key) => objects.get(key) ?? null,
    delete: async (key) => {
      deleted.push(key);
      objects.delete(key);
    },
    publicUrl: (key) => `https://media.test/${key}`,
  };
  return { store, objects, deleted };
}

let db: DB;
let fake: ReturnType<typeof fakeStore>;
let userId: string;
let ip = 10;

beforeEach(async () => {
  db = await freshDb();
  fake = fakeStore();
  setMediaStoreForTesting(fake.store);
  signOutBrowser();
  testIp.value = `100.64.0.${ip++}`;
  await registerUser({ email: "media@example.com", username: "media_user" });
  userId = await userIdFor(db, "media@example.com");
});

/** Simulate presign → browser PUT (of `actual` bytes) → complete. */
async function upload(kind: "image" | "video" | "avatar", type: string, declared: number, actual = declared) {
  const start = await startUpload(db, fake.store, userId, kind, type, declared);
  fake.objects.set(start.key, { size: actual, contentType: type });
  return completeUpload(db, fake.store, userId, start.id);
}

describe("upload validation", () => {
  it("accepts only the allowed types per kind", () => {
    for (const t of ["image/jpeg", "image/png", "image/webp", "image/gif"]) {
      expect(() => checkUpload("image", t, 1000)).not.toThrow();
    }
    expect(() => checkUpload("image", "image/svg+xml", 1000)).toThrow(MediaError);
    expect(() => checkUpload("image", "video/mp4", 1000)).toThrow(MediaError);
    expect(() => checkUpload("video", "video/mp4", 1000)).not.toThrow();
    expect(() => checkUpload("video", "video/webm", 1000)).not.toThrow();
    expect(() => checkUpload("video", "video/quicktime", 1000)).toThrow(MediaError);
  });

  it("enforces per-file limits from env (5 MB images, 50 MB video)", () => {
    expect(() => checkUpload("image", "image/png", 5 * MB)).not.toThrow();
    expect(() => checkUpload("image", "image/png", 5 * MB + 1)).toThrow(/too large/);
    expect(() => checkUpload("video", "video/mp4", 50 * MB + 1)).toThrow(/too large/);
  });
});

describe("per-user quota (MEDIA_QUOTA_MB_PER_USER=10 in tests)", () => {
  it("rejects an upload that would exceed the quota", async () => {
    await upload("video", "video/mp4", 8 * MB);
    expect(await usedBytes(db, userId)).toBe(8 * MB);
    await expect(startUpload(db, fake.store, userId, "image", "image/png", 3 * MB)).rejects.toThrow(
      /quota/
    );
    // Smaller one still fits.
    await upload("image", "image/png", 1 * MB);
    expect(await usedBytes(db, userId)).toBe(9 * MB);
  });

  it("pending uploads reserve quota", async () => {
    await startUpload(db, fake.store, userId, "video", "video/mp4", 9 * MB);
    await expect(startUpload(db, fake.store, userId, "image", "image/png", 2 * MB)).rejects.toThrow(/quota/);
  });

  it("checks the REAL object size on completion and deletes cheats", async () => {
    const start = await startUpload(db, fake.store, userId, "image", "image/png", 1000);
    fake.objects.set(start.key, { size: 6 * MB, contentType: "image/png" }); // lied about size
    await expect(completeUpload(db, fake.store, userId, start.id)).rejects.toThrow(/too large/);
    expect(fake.deleted).toContain(start.key);
    expect(await usedBytes(db, userId)).toBe(0);
  });

  it("rejects a mismatched content type on completion", async () => {
    const start = await startUpload(db, fake.store, userId, "image", "image/png", 1000);
    fake.objects.set(start.key, { size: 1000, contentType: "text/html" });
    await expect(completeUpload(db, fake.store, userId, start.id)).rejects.toThrow();
    expect(fake.deleted).toContain(start.key);
  });

  it("presign route returns 413 over quota and 415 for bad types", async () => {
    const over = await presignRoute(req("/api/media", { body: { kind: "video", content_type: "video/mp4", size: 11 * MB } }));
    expect(over.status).toBe(413);
    const bad = await presignRoute(req("/api/media", { body: { kind: "image", content_type: "application/pdf", size: 10 } }));
    expect(bad.status).toBe(415);
  });

  it("a client can't upload into someone else's quota", async () => {
    const res = await presignRoute(
      req("/api/media", { body: { kind: "image", content_type: "image/png", size: 10, user_id: "someone-else" } })
    );
    expect(res.status).toBe(403);
  });
});

describe("deleting media frees quota and R2 objects", () => {
  it("DELETE route removes object + row and clears the avatar", async () => {
    const pres = await presignRoute(req("/api/media", { body: { kind: "avatar", content_type: "image/webp", size: 2000 } }));
    const { id, key, url } = await pres.json();
    fake.objects.set(key, { size: 2000, contentType: "image/webp" });
    expect((await completeRoute(req("/x", { body: {} }), params({ id }))).status).toBe(200);
    await profilePatch(req("/api/profile", { method: "PATCH", body: { avatar_url: url } }));

    const del = await deleteRoute(req("/x", { method: "DELETE" }), params({ id }));
    expect(del.status).toBe(200);
    expect(fake.deleted).toContain(key);
    expect(await usedBytes(db, userId)).toBe(0);
    const prof = await db.select().from(schema.profiles).get();
    expect(prof?.avatar_url).toBeNull();
  });

  it("replacing / removing media on profile save deletes the old R2 objects", async () => {
    const a = await upload("avatar", "image/png", 1000);
    const b = await upload("avatar", "image/png", 1000);
    const g = await upload("image", "image/png", 1000);

    await profilePatch(
      req("/api/profile", {
        method: "PATCH",
        body: {
          avatar_url: a.url,
          content_blocks: [{ id: "g", type: "gallery", title: "G", urls: [g.url] }],
        },
      })
    );
    // Replace avatar a → b, drop the gallery image.
    await profilePatch(
      req("/api/profile", { method: "PATCH", body: { avatar_url: b.url, content_blocks: [] } })
    );
    expect(fake.deleted).toEqual(expect.arrayContaining([a.key, g.key]));
    expect(fake.deleted).not.toContain(b.key);
    expect(await usedBytes(db, userId)).toBe(1000);
  });
});

describe("video links", () => {
  it("parses YouTube variants and rejects lookalikes", () => {
    for (const u of [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ?t=5",
      "https://youtube.com/shorts/dQw4w9WgXcQ",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ&feature=share",
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    ]) {
      expect(parseYouTubeId(u)).toBe("dQw4w9WgXcQ");
    }
    expect(parseYouTubeId("https://evil-youtube.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(parseYouTubeId("https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(parseYouTubeId("javascript:alert(1)")).toBeNull();
  });

  it("video must be YouTube or our own MP4/WebM", () => {
    expect(normalizeVideoUrl("https://youtu.be/dQw4w9WgXcQ", "https://media.test")).toBe(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    );
    expect(normalizeVideoUrl("https://media.test/u/x/video/a.mp4", "https://media.test")).toBe(
      "https://media.test/u/x/video/a.mp4"
    );
    expect(() => normalizeVideoUrl("https://evil.example/a.mp4", "https://media.test")).toThrow();
  });
});
