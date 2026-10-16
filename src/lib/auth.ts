import { cookies } from "next/headers";
import { getDemoProfileById } from "@/lib/demo-store";
import { createClient } from "@/lib/supabase/server";
import type { AppRole, Profile } from "@/lib/types";
import { isDemoMode } from "@/lib/utils";

/** Stores authenticated demo user_id */
export const DEMO_SESSION_COOKIE = "hb_demo_uid";
/** Role mirror for middleware (plain string, no functions) */
export const DEMO_ROLE_COOKIE = "hb_demo_role";

export async function getSessionProfile(): Promise<Profile | null> {
  if (isDemoMode()) {
    const userId = cookies().get(DEMO_SESSION_COOKIE)?.value;
    if (!userId) return null;
    return getDemoProfileById(userId);
  }

  const supabase = createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return (data as Profile | null) ?? null;
}

export async function requireRole(role: AppRole): Promise<Profile> {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== role) {
    throw new Error("UNAUTHORIZED");
  }
  return profile;
}

export async function requireAnyAuth(): Promise<Profile> {
  const profile = await getSessionProfile();
  if (!profile) throw new Error("UNAUTHORIZED");
  return profile;
}
