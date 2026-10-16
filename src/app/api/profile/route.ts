import { getSessionProfile } from "@/lib/auth";
import { updateDemoProfile } from "@/lib/demo-store";
import { createClient } from "@/lib/supabase/server";
import type { Profile, ProfileLayout, SocialLink } from "@/lib/types";
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

const layoutSchema = z.object({
  show_hero: z.boolean(),
  show_save_contact: z.boolean(),
  show_exchange_contact: z.boolean(),
  show_quick_actions: z.boolean(),
  show_about: z.boolean(),
  show_video: z.boolean(),
  show_social: z.boolean(),
  show_business: z.boolean(),
  show_lead_banner: z.boolean(),
  section_order: z.array(
    z.enum(["about", "video", "social", "business"])
  ),
});

const schema = z.object({
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
  layout: layoutSchema.optional(),
});

export async function PATCH(request: Request) {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid profile payload" }, { status: 400 });
  }

  const updates: Partial<Profile> = {
    ...parsed.data,
    email: parsed.data.email || null,
    avatar_url: parsed.data.avatar_url || null,
    banner_url: parsed.data.banner_url || null,
    video_url: parsed.data.video_url || null,
    social_links: parsed.data.social_links as SocialLink[] | undefined,
    layout: parsed.data.layout as ProfileLayout | undefined,
  };

  if (isDemoMode()) {
    const next = updateDemoProfile(profile.user_id, updates);
    return NextResponse.json({ ok: true, profile: next });
  }

  const supabase = createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("user_id", profile.user_id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, profile: data });
}
