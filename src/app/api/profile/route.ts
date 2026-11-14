import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, schema as db } from "@/db";
import { errorResponse } from "@/lib/api";
import { AuthError, requireUser } from "@/lib/auth";
import { fetchProfileById } from "@/lib/data";
import {
  deleteDereferenced,
  MediaError,
  normalizeImageUrl,
  normalizeVideoUrl,
  referencedUrls,
} from "@/lib/media";
import { getMediaStore, mediaPublicBase } from "@/lib/r2";
import type { ContentBlock, ProfileLayout, SocialLink } from "@/lib/types";
import { z } from "zod";

const socialSchema = z.object({
  id: z.string(),
  type: z.string(),
  label: z.string(),
  path: z.string(),
  sort_order: z.number().optional(),
  visible: z.boolean().optional(),
});

const blockSchema = z.object({
  id: z.string(),
  type: z.enum(["text", "image", "gallery", "video", "file"]),
  title: z.string(),
  body: z.string().optional(),
  url: z.string().optional(),
  urls: z.array(z.string()).optional(),
  sort_order: z.number().optional(),
  visible: z.boolean().optional(),
});

const layoutSchema = z.object({
  show_hero: z.boolean(),
  show_save_contact: z.boolean(),
  show_exchange_contact: z.boolean(),
  show_quick_actions: z.boolean(),
  show_about: z.boolean(),
  show_media: z.boolean(),
  show_social: z.boolean(),
  show_business: z.boolean(),
  show_lead_banner: z.boolean(),
  section_order: z.array(
    z.enum(["about", "media", "social", "business"])
  ),
});

const schema = z.object({
  user_id: z.string().optional(),
  full_name: z.string().min(1).optional(),
  designation: z.string().optional(),
  location: z.string().optional(),
  bio: z.string().optional(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  avatar_url: z.string().optional().nullable(),
  banner_url: z.string().optional().nullable(),
  video_url: z.string().optional().nullable(),
  social_links: z.array(socialSchema).optional(),
  content_blocks: z.array(blockSchema).optional(),
  layout: layoutSchema.optional(),
});

export async function PATCH(request: Request) {
  try {
    const session = await requireUser();

    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid profile payload" }, { status: 400 });
    }

    if (
      session.role !== "admin" &&
      parsed.data.user_id &&
      parsed.data.user_id !== session.user_id
    ) {
      throw new AuthError(403);
    }
    const targetUserId =
      session.role === "admin" && parsed.data.user_id
        ? parsed.data.user_id
        : session.user_id;

    // Explicit whitelist — role, username, stats etc. can never be set here.
    const d = parsed.data;
    const updates: Partial<typeof db.profiles.$inferInsert> = {
      updated_at: new Date().toISOString(),
    };
    if (d.full_name !== undefined) updates.full_name = d.full_name;
    if (d.designation !== undefined) updates.designation = d.designation;
    if (d.location !== undefined) updates.location = d.location;
    if (d.bio !== undefined) updates.bio = d.bio;
    if (d.phone !== undefined) updates.phone = d.phone || null;
    if (d.email !== undefined) updates.email = d.email || null;
    const base = mediaPublicBase();
    const video = (u: string | null | undefined) =>
      u?.trim() && u.trim() !== "https://" ? normalizeVideoUrl(u, base) : null;

    if (d.avatar_url !== undefined) updates.avatar_url = normalizeImageUrl(d.avatar_url);
    if (d.banner_url !== undefined) updates.banner_url = normalizeImageUrl(d.banner_url);
    if (d.video_url !== undefined) updates.video_url = video(d.video_url);
    if (d.social_links !== undefined)
      updates.social_links = d.social_links as SocialLink[];
    if (d.content_blocks !== undefined) {
      updates.content_blocks = (d.content_blocks as ContentBlock[]).map((b) => {
        if (b.type === "video") return { ...b, url: video(b.url) ?? undefined };
        if (b.type === "gallery")
          return {
            ...b,
            urls: (b.urls ?? [])
              .map((u) => normalizeImageUrl(u))
              .filter((u): u is string => Boolean(u)),
          };
        if (b.type === "image" || b.type === "file")
          return { ...b, url: normalizeImageUrl(b.url) ?? undefined };
        return b;
      });
    }
    if (d.layout !== undefined) updates.layout = d.layout as ProfileLayout;

    const before = await fetchProfileById(targetUserId);
    if (!before) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    await getDb()
      .update(db.profiles)
      .set(updates)
      .where(eq(db.profiles.user_id, targetUserId));
    const after = (await fetchProfileById(targetUserId))!;

    // Removed or replaced uploads are deleted from R2 straight away.
    const store = getMediaStore();
    if (store) {
      await deleteDereferenced(
        getDb(),
        store,
        targetUserId,
        referencedUrls(before),
        referencedUrls(after)
      );
    }

    return NextResponse.json({ ok: true, profile: after });
  } catch (err) {
    if (err instanceof MediaError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return errorResponse(err);
  }
}
