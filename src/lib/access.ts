import { and, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Profile } from "@/lib/types";

/**
 * Customers (role "client") only get a dashboard and a public profile once
 * they own an ACTIVE (paid) card. Managers and admins are always active.
 */
export async function hasPaidAccess(profile: Pick<Profile, "user_id" | "role">) {
  if (profile.role !== "client") return true;
  const card = await getDb()
    .select({ id: schema.cards.card_id })
    .from(schema.cards)
    .where(and(eq(schema.cards.user_id, profile.user_id), eq(schema.cards.status, "ACTIVE")))
    .get();
  return Boolean(card);
}

/** The customer's card that is waiting for payment, if any. */
export async function pendingCardToken(userId: string) {
  const card = await getDb()
    .select({ token: schema.cards.public_token })
    .from(schema.cards)
    .where(and(eq(schema.cards.user_id, userId), inArray(schema.cards.status, ["RESERVED"])))
    .get();
  return card?.token ?? null;
}

/** A card a new customer can register with: exists and is still unsold. */
export async function registrableCard(token: string | undefined | null) {
  if (!token) return null;
  const card = await getDb()
    .select({ card_id: schema.cards.card_id, status: schema.cards.status })
    .from(schema.cards)
    .where(eq(schema.cards.public_token, token))
    .get();
  return card && (card.status === "UNCLAIMED" || card.status === "RESERVED") ? card : null;
}
