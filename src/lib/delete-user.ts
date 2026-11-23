import { and, eq, inArray } from "drizzle-orm";
import { type DB, schema } from "@/db";
import { releaseCard } from "@/lib/cards";
import { removeMedia } from "@/lib/media";
import { getMediaStore } from "@/lib/r2";

/**
 * Clean-up that must run before a user row is deleted (self-delete or admin):
 * - their uploaded media files are removed
 * - RESERVED (unpaid) cards are released so they can be sold again
 * - ACTIVE cards are BLOCKED (an admin can unblock/re-issue later)
 * - open orders are cancelled; paid orders/invoices are KEPT (user_id → null)
 * Profile, sessions, logins and leads go with the user row (cascade).
 */
export async function prepareUserDeletion(db: DB, userId: string) {
  const rows = await db.select().from(schema.media).where(eq(schema.media.user_id, userId));
  const store = getMediaStore();
  if (store && rows.length) await removeMedia(db, store, rows);

  const reserved = await db
    .select({ card_id: schema.cards.card_id })
    .from(schema.cards)
    .where(and(eq(schema.cards.user_id, userId), eq(schema.cards.status, "RESERVED")));
  for (const c of reserved) await releaseCard(db, c.card_id);

  const now = new Date().toISOString();
  await db
    .update(schema.cards)
    .set({ status: "BLOCKED", blocked_at: now, updated_at: now })
    .where(and(eq(schema.cards.user_id, userId), inArray(schema.cards.status, ["ACTIVE", "UNCLAIMED"])));
  await db
    .update(schema.orders)
    .set({ status: "CANCELLED", cash_code_hash: null, cash_code_expires_at: null, updated_at: now })
    .where(and(eq(schema.orders.user_id, userId), eq(schema.orders.status, "PENDING")));
}

/** Admin removal: clean up, then delete the user (everything else cascades). */
export async function deleteUserCompletely(db: DB, userId: string) {
  await prepareUserDeletion(db, userId);
  await db.delete(schema.session).where(eq(schema.session.userId, userId));
  await db.delete(schema.user).where(eq(schema.user.id, userId));
}
