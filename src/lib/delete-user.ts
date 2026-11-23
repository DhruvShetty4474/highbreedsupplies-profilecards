import { and, eq, inArray } from "drizzle-orm";
import { type DB, schema } from "@/db";
import { releaseCard } from "@/lib/cards";

/**
 * SOFT delete (nothing is erased, so it can be restored):
 * - the profile is marked deleted: hidden everywhere, public page gone
 * - every session is removed and sign-in is refused from now on
 * - RESERVED (unpaid) cards are released so they can be sold again
 * - ACTIVE cards are BLOCKED (an admin can unblock / re-issue later)
 * - open orders are cancelled; paid orders and invoices stay as they are
 * Photos, leads and all other data are kept.
 */
export async function softDeleteUser(db: DB, userId: string) {
  const now = new Date().toISOString();
  const reserved = await db
    .select({ card_id: schema.cards.card_id })
    .from(schema.cards)
    .where(and(eq(schema.cards.user_id, userId), eq(schema.cards.status, "RESERVED")));
  for (const c of reserved) await releaseCard(db, c.card_id);

  await db
    .update(schema.cards)
    .set({ status: "BLOCKED", blocked_at: now, updated_at: now })
    .where(and(eq(schema.cards.user_id, userId), inArray(schema.cards.status, ["ACTIVE", "UNCLAIMED"])));
  await db
    .update(schema.orders)
    .set({ status: "CANCELLED", cash_code_hash: null, cash_code_expires_at: null, updated_at: now })
    .where(and(eq(schema.orders.user_id, userId), eq(schema.orders.status, "PENDING")));
  await db
    .update(schema.profiles)
    .set({ deleted_at: now, updated_at: now })
    .where(eq(schema.profiles.user_id, userId));
  await db.delete(schema.session).where(eq(schema.session.userId, userId));
}

/** True when the account was soft-deleted (sign-in must be refused). */
export async function isDeletedUser(db: DB, userId: string) {
  const row = await db
    .select({ d: schema.profiles.deleted_at })
    .from(schema.profiles)
    .where(eq(schema.profiles.user_id, userId))
    .get();
  return Boolean(row?.d);
}
