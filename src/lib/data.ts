import {
  getDemoCardById,
  getDemoCardByToken,
  getDemoLeadsForUser,
  getDemoMetrics,
  getDemoProfileById,
  getDemoProfileByUsername,
  demoCards,
} from "@/lib/demo-data";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { AdminMetrics, Card, Lead, Profile } from "@/lib/types";
import {
  DEMO_REGISTRY_COOKIE,
  hydrateDemoAccountsFromCookie,
} from "@/lib/demo-registry";
import { isDemoMode } from "@/lib/utils";
import { cookies } from "next/headers";

function ensureDemoHydrated() {
  if (!isDemoMode()) return;
  try {
    hydrateDemoAccountsFromCookie(
      cookies().get(DEMO_REGISTRY_COOKIE)?.value
    );
  } catch {
    // cookies() unavailable in some static contexts — seed accounts still work
  }
}

export async function fetchProfileByUsername(
  username: string
): Promise<Profile | null> {
  if (isDemoMode()) {
    ensureDemoHydrated();
    return getDemoProfileByUsername(username) ?? null;
  }

  const supabase = createClient() ?? createServiceClient();
  if (!supabase) return getDemoProfileByUsername(username) ?? null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username.toLowerCase())
    .maybeSingle();

  return (data as Profile | null) ?? null;
}

export async function fetchProfileById(
  userId: string
): Promise<Profile | null> {
  if (isDemoMode()) {
    ensureDemoHydrated();
    return getDemoProfileById(userId) ?? null;
  }

  const supabase = createClient() ?? createServiceClient();
  if (!supabase) return getDemoProfileById(userId) ?? null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  return (data as Profile | null) ?? null;
}

export async function fetchCardByToken(token: string): Promise<Card | null> {
  if (isDemoMode()) return getDemoCardByToken(token) ?? null;

  const supabase = createClient() ?? createServiceClient();
  if (!supabase) return getDemoCardByToken(token) ?? null;

  const { data } = await supabase
    .from("cards")
    .select("*")
    .eq("public_token", token)
    .maybeSingle();

  return (data as Card | null) ?? null;
}

export async function fetchCardById(cardId: string): Promise<Card | null> {
  if (isDemoMode()) return getDemoCardById(cardId) ?? null;

  const supabase = createClient() ?? createServiceClient();
  if (!supabase) return getDemoCardById(cardId) ?? null;

  const { data } = await supabase
    .from("cards")
    .select("*")
    .eq("card_id", cardId)
    .maybeSingle();

  return (data as Card | null) ?? null;
}

export async function fetchLeadsForUser(userId: string): Promise<Lead[]> {
  if (isDemoMode()) return getDemoLeadsForUser(userId);

  const supabase = createClient();
  if (!supabase) return getDemoLeadsForUser(userId);

  const { data } = await supabase
    .from("leads")
    .select("*")
    .eq("cardholder_user_id", userId)
    .order("created_at", { ascending: false });

  return (data as Lead[]) ?? [];
}

export async function fetchAllCards(): Promise<Card[]> {
  if (isDemoMode()) return demoCards;

  const supabase = createClient();
  if (!supabase) return demoCards;

  const { data } = await supabase
    .from("cards")
    .select("*")
    .order("card_id", { ascending: true });

  return (data as Card[]) ?? [];
}

export async function fetchAdminMetrics(): Promise<AdminMetrics> {
  if (isDemoMode()) return getDemoMetrics();

  const supabase = createClient();
  if (!supabase) return getDemoMetrics();

  const [
    { data: cards },
    { count: profiles },
    { count: leads },
    { count: batches },
  ] = await Promise.all([
    supabase.from("cards").select("status, programming_verified"),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("leads").select("*", { count: "exact", head: true }),
    supabase.from("card_batches").select("*", { count: "exact", head: true }),
  ]);

  const list = (cards ?? []) as Pick<Card, "status" | "programming_verified">[];

  return {
    total_cards: list.length,
    unclaimed: list.filter((c) => c.status === "UNCLAIMED").length,
    active: list.filter((c) => c.status === "ACTIVE").length,
    blocked: list.filter((c) => c.status === "BLOCKED").length,
    programmed: list.filter((c) => c.programming_verified).length,
    total_profiles: profiles ?? 0,
    total_leads: leads ?? 0,
    batches: batches ?? 0,
  };
}
