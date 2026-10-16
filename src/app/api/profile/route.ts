import { getSessionProfile } from "@/lib/auth";
import { updateDemoProfile } from "@/lib/demo-store";
import { createClient } from "@/lib/supabase/server";
import type {
  ContentBlock,
  Profile,
  ProfileLayout,
  SocialLink,
} from "@/lib/types";
import { isDemoMode } from "@/lib/utils";
import { NextResponse } from "next/server";
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
  const session = await getSessionProfile();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid profile payload" }, { status: 400 });
  }

  const targetUserId =
    session.role === "admin" && parsed.data.user_id
      ? parsed.data.user_id
      : session.user_id;

  if (
    session.role !== "admin" &&
    parsed.data.user_id &&
    parsed.data.user_id !== session.user_id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { user_id: _ignore, ...rest } = parsed.data;
  const updates: Partial<Profile> = {
    ...rest,
    email: rest.email || null,
    avatar_url: rest.avatar_url || null,
    banner_url: rest.banner_url || null,
    video_url: rest.video_url || null,
    social_links: rest.social_links as SocialLink[] | undefined,
    content_blocks: rest.content_blocks as ContentBlock[] | undefined,
    layout: rest.layout as ProfileLayout | undefined,
  };

  if (isDemoMode()) {
    const next = updateDemoProfile(targetUserId, updates);
    if (!next) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, profile: next });
  }

  const supabase = createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("user_id", targetUserId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, profile: data });
}
