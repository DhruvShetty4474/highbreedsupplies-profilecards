import { and, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import {
  DEFAULT_PROFILE_LAYOUT,
  type AdminMetrics,
  type Card,
  type Lead,
  type Profile,
} from "@/lib/types";

type ProfileRow = typeof schema.profiles.$inferSelect;

export function toProfile(row: ProfileRow): Profile {
  return {
    user_id: row.user_id,
    username: row.username,
    full_name: row.full_name,
    designation: row.designation,
    location: row.location,
    bio: row.bio,
    avatar_url: row.avatar_url,
    banner_url: row.banner_url,
    video_url: row.video_url,
    phone: row.phone,
    email: row.email,
    social_links: row.social_links ?? [],
    content_blocks: row.content_blocks ?? [],
    layout: row.layout ?? DEFAULT_PROFILE_LAYOUT,
    role: row.role,
    theme: row.theme ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function fetchProfileByUsername(
  username: string
): Promise<Profile | null> {
  const row = await getDb()
    .select()
    .from(schema.profiles)
    .where(and(eq(schema.profiles.username, username.toLowerCase()), isNull(schema.profiles.deleted_at)))
    .get();
  // The super admin has no public page.
  return row && row.role !== "superadmin" ? toProfile(row) : null;
}

export async function fetchProfileById(userId: string): Promise<Profile | null> {
  const row = await getDb()
    .select()
    .from(schema.profiles)
    .where(and(eq(schema.profiles.user_id, userId), isNull(schema.profiles.deleted_at)))
    .get();
  return row ? toProfile(row) : null;
}

/** Admin-only callers: list customer and manager profiles. */
export async function fetchClientProfiles(): Promise<Profile[]> {
  const rows = await getDb()
    .select()
    .from(schema.profiles)
    .where(and(inArray(schema.profiles.role, ["client", "manager"]), isNull(schema.profiles.deleted_at)))
    .orderBy(desc(schema.profiles.created_at));
  return rows.map(toProfile);
}

/** Managers, for batch assignment. */
export async function fetchManagers() {
  return getDb()
    .select({
      user_id: schema.profiles.user_id,
      full_name: schema.profiles.full_name,
      username: schema.profiles.username,
    })
    .from(schema.profiles)
    .where(and(eq(schema.profiles.role, "manager"), isNull(schema.profiles.deleted_at)))
    .orderBy(schema.profiles.full_name);
}

export async function fetchCardByToken(token: string): Promise<Card | null> {
  return (
    (await getDb()
      .select()
      .from(schema.cards)
      .where(and(eq(schema.cards.public_token, token), isNull(schema.cards.deleted_at)))
      .get()) ?? null
  );
}

export async function fetchCardById(cardId: string): Promise<Card | null> {
  return (
    (await getDb()
      .select()
      .from(schema.cards)
      .where(and(eq(schema.cards.card_id, cardId), isNull(schema.cards.deleted_at)))
      .get()) ?? null
  );
}

export async function fetchCardsForUser(userId: string): Promise<Card[]> {
  return getDb()
    .select()
    .from(schema.cards)
    .where(and(eq(schema.cards.user_id, userId), isNull(schema.cards.deleted_at)))
    .orderBy(schema.cards.card_id);
}

/** Admin-only callers. */
export async function fetchCardsForBatch(batchId: string): Promise<Card[]> {
  return getDb()
    .select()
    .from(schema.cards)
    .where(and(eq(schema.cards.batch_id, batchId), isNull(schema.cards.deleted_at)))
    .orderBy(schema.cards.card_id);
}

/** Admin-only callers. */
export async function fetchBatches() {
  return getDb()
    .select()
    .from(schema.cardBatches)
    .orderBy(desc(schema.cardBatches.created_at));
}

/** Admin-only callers. */
export async function fetchAllCards(): Promise<Card[]> {
  const rows = await getDb()
    .select({ card: schema.cards, owner_name: schema.profiles.full_name })
    .from(schema.cards)
    .leftJoin(schema.profiles, eq(schema.profiles.user_id, schema.cards.user_id))
    .where(isNull(schema.cards.deleted_at))
    .orderBy(schema.cards.card_id);
  return rows.map((r) => ({ ...r.card, owner_name: r.owner_name ?? null }));
}

export async function fetchLeadsForUser(userId: string): Promise<Lead[]> {
  return getDb()
    .select()
    .from(schema.leads)
    .where(eq(schema.leads.cardholder_user_id, userId))
    .orderBy(desc(schema.leads.created_at));
}

export type ProfileStats = {
  reaches: number;
  shares: number;
  contact_saves: number;
  leads: number;
};

export async function fetchStats(userId: string): Promise<ProfileStats> {
  const db = getDb();
  const [row, leadCount] = await Promise.all([
    db
      .select({
        reaches: schema.profiles.stat_reaches,
        shares: schema.profiles.stat_shares,
        contact_saves: schema.profiles.stat_contact_saves,
      })
      .from(schema.profiles)
      .where(eq(schema.profiles.user_id, userId))
      .get(),
    db
      .select({ n: count() })
      .from(schema.leads)
      .where(eq(schema.leads.cardholder_user_id, userId))
      .get(),
  ]);
  return {
    reaches: row?.reaches ?? 0,
    shares: row?.shares ?? 0,
    contact_saves: row?.contact_saves ?? 0,
    leads: leadCount?.n ?? 0,
  };
}

const statColumn = {
  reach: "stat_reaches",
  share: "stat_shares",
  contact_save: "stat_contact_saves",
} as const;

export async function bumpStat(
  userId: string,
  event: keyof typeof statColumn
) {
  const col = schema.profiles[statColumn[event]];
  await getDb()
    .update(schema.profiles)
    .set({ [statColumn[event]]: sql`${col} + 1` })
    .where(eq(schema.profiles.user_id, userId));
}

export async function fetchSharePrefs(userId: string) {
  const row = await getDb()
    .select({
      offline: schema.profiles.share_offline,
      quick_share: schema.profiles.quick_share,
    })
    .from(schema.profiles)
    .where(eq(schema.profiles.user_id, userId))
    .get();
  return {
    user_id: userId,
    offline: row?.offline ?? false,
    quick_share: row?.quick_share ?? null,
  };
}

export async function fetchAdminMetrics(): Promise<AdminMetrics> {
  const db = getDb();
  const [byStatus, programmed, profiles, leadsN, batches] = await Promise.all([
    db
      .select({ status: schema.cards.status, n: count() })
      .from(schema.cards)
      .where(isNull(schema.cards.deleted_at))
      .groupBy(schema.cards.status),
    db
      .select({ n: count() })
      .from(schema.cards)
      .where(and(eq(schema.cards.programming_status, "PROGRAMMED"), isNull(schema.cards.deleted_at)))
      .get(),
    db
      .select({ n: count() })
      .from(schema.profiles)
      .where(and(eq(schema.profiles.role, "client"), isNull(schema.profiles.deleted_at)))
      .get(),
    db.select({ n: count() }).from(schema.leads).get(),
    db.select({ n: count() }).from(schema.cardBatches).get(),
  ]);
  const by = (s: string) => byStatus.find((r) => r.status === s)?.n ?? 0;
  return {
    total_cards: byStatus.reduce((a, r) => a + r.n, 0),
    unclaimed: by("UNCLAIMED"),
    active: by("ACTIVE"),
    blocked: by("BLOCKED"),
    programmed: programmed?.n ?? 0,
    total_profiles: profiles?.n ?? 0,
    total_leads: leadsN?.n ?? 0,
    batches: batches?.n ?? 0,
  };
}
