import { and, eq, inArray, isNull } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getSettings } from "@/lib/settings";
import type { Profile } from "@/lib/types";

export type AccessState =
  | { kind: "staff" } // manager / admin: always on
  | { kind: "paid" } // owns an ACTIVE card
  | { kind: "trial"; daysLeft: number } // registered without a card, trial running
  | { kind: "card_unpaid"; token: string } // registered from a card, payment pending
  | { kind: "expired" }; // trial over, no paid card

const DAY = 24 * 60 * 60 * 1000;

/**
 * Two ways in:
 * - from a HighCard (paid): nothing is live until the card is paid;
 * - from the normal register link: a free trial for `free_trial_days`.
 */
export async function accessState(
  profile: Pick<Profile, "user_id" | "role" | "created_at">
): Promise<AccessState> {
  if (profile.role !== "client") return { kind: "staff" };
  const db = getDb();
  const cards = await db
    .select({ status: schema.cards.status, token: schema.cards.public_token })
    .from(schema.cards)
    .where(
      and(
        eq(schema.cards.user_id, profile.user_id),
        inArray(schema.cards.status, ["ACTIVE", "RESERVED"]),
        isNull(schema.cards.deleted_at)
      )
    );
  if (cards.some((c) => c.status === "ACTIVE")) return { kind: "paid" };
  const reserved = cards.find((c) => c.status === "RESERVED");
  if (reserved) return { kind: "card_unpaid", token: reserved.token };

  const { free_trial_days } = await getSettings(db);
  const ends = new Date(profile.created_at ?? Date.now()).getTime() + free_trial_days * DAY;
  const left = ends - Date.now();
  return left > 0 ? { kind: "trial", daysLeft: Math.ceil(left / DAY) } : { kind: "expired" };
}

/** Dashboard + public profile are live for staff, paid customers and running trials. */
export async function hasPaidAccess(profile: Pick<Profile, "user_id" | "role" | "created_at">) {
  const s = await accessState(profile);
  return s.kind === "staff" || s.kind === "paid" || s.kind === "trial";
}

/** The customer's card that is waiting for payment, if any. */
export async function pendingCardToken(userId: string) {
  const card = await getDb()
    .select({ token: schema.cards.public_token })
    .from(schema.cards)
    .where(
      and(eq(schema.cards.user_id, userId), eq(schema.cards.status, "RESERVED"), isNull(schema.cards.deleted_at))
    )
    .get();
  return card?.token ?? null;
}

/** A card a new customer can register with: exists and is still unsold. */
export async function registrableCard(token: string | undefined | null) {
  if (!token) return null;
  const card = await getDb()
    .select({ card_id: schema.cards.card_id, status: schema.cards.status })
    .from(schema.cards)
    .where(and(eq(schema.cards.public_token, token), isNull(schema.cards.deleted_at)))
    .get();
  return card && (card.status === "UNCLAIMED" || card.status === "RESERVED") ? card : null;
}
