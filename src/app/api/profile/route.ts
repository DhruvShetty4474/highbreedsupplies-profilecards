import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, schema as db } from "@/db";
import { errorResponse } from "@/lib/api";
import { AuthError, requireUser } from "@/lib/auth";
import { fetchProfileById } from "@/lib/data";
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
    if (d.avatar_url !== undefined) updates.avatar_url = d.avatar_url || null;
    if (d.banner_url !== undefined) updates.banner_url = d.banner_url || null;
    if (d.video_url !== undefined) updates.video_url = d.video_url || null;
    if (d.social_links !== undefined)
      updates.social_links = d.social_links as SocialLink[];
    if (d.content_blocks !== undefined)
      updates.content_blocks = d.content_blocks as ContentBlock[];
    if (d.layout !== undefined) updates.layout = d.layout as ProfileLayout;

    const res = await getDb()
      .update(db.profiles)
      .set(updates)
      .where(eq(db.profiles.user_id, targetUserId));
    if (res.meta.changes !== 1) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, profile: await fetchProfileById(targetUserId) });
  } catch (err) {
    return errorResponse(err);
  }
}
