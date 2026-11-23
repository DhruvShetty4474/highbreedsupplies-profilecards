/**
 * Card lifecycle — pure-ish functions over a Drizzle DB so they can be unit
 * tested against an in-memory SQLite database.
 *
 *   status:             UNCLAIMED → RESERVED (registered + printed code)
 *                       → ACTIVE (paid) ; any → BLOCKED (admin)
 *   programming_status: UNPROGRAMMED → PROGRAMMED | FAILED (factory verify)
 *
 * The two never influence each other.
 */
import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import type { DB } from "@/db";
import * as schema from "@/db/schema";
import type { Card, Profile } from "@/lib/types";

// nanoid uses crypto.getRandomValues (CSPRNG) with unbiased sampling.
const tokenBody = customAlphabet(
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  24
);
const batchSuffix = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);
// No 0/O, 1/I/L: easy to read off a printed card. 31^6 ≈ 887 million codes.
const activationCodeBody = customAlphabet("ABCDEFGHJKMNPQRSTUVWXYZ23456789", 6);

/** Random code printed inside the card's packaging (e.g. "K7P2QX"). */
export function generateActivationCode() {
  return activationCodeBody();
}

/** Unpaid reservations are released after this many days. */
export const RESERVATION_DAYS = 7;

export const TOKEN_RE = /^tok_[A-Za-z0-9]{24}$/;

export function generatePublicToken() {
  return `tok_${tokenBody()}`;
}

export function formatCardId(sequence: number) {
  return `HB${String(sequence).padStart(6, "0")}`;
}

/** Public card URL written to the NFC chip and encoded in the QR. */
export function cardUrl(token: string, base: string) {
  return `${base.replace(/\/$/, "")}/c/${token}`;
}

/** Atomically reserve `n` sequence numbers; returns the first one. */
export async function reserveSequence(db: DB, name: string, n: number) {
  const row = await db
    .insert(schema.counters)
    .values({ name, value: n })
    .onConflictDoUpdate({
      target: schema.counters.name,
      set: { value: sql`${schema.counters.value} + ${n}` },
    })
    .returning({ value: schema.counters.value })
    .get();
  return row.value - n + 1;
}

export type NewBatch = {
  quantity: number;
  label: string;
  notes?: string | null;
  createdBy: string | null;
  baseUrl: string;
  /** Manager who sells this batch (gets the referral). */
  managerId?: string | null;
};

/**
 * Create a batch + its cards in ONE D1 batch (all-or-nothing). card_ids
 * come from a persistent counter, so they can never collide; a failed
 * attempt only leaves a gap in the sequence.
 */
export async function createBatch(db: DB, opts: NewBatch) {
  const start = await reserveSequence(db, "card_id", opts.quantity);
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const batchId = `BATCH-${day}-${batchSuffix()}`;

  let lastError: unknown;
  // Retry only covers the astronomically unlikely token collision.
  for (let attempt = 0; attempt < 3; attempt++) {
    const cards = Array.from({ length: opts.quantity }, (_, i) => {
      const token = generatePublicToken();
      const url = cardUrl(token, opts.baseUrl);
      return {
        card_id: formatCardId(start + i),
        public_token: token,
        nfc_url: url,
        qr_url: url,
        batch_id: batchId,
        manager_id: opts.managerId ?? null,
        activation_code: generateActivationCode(),
      };
    });

    const CHUNK = 15; // keep under D1's 100 bound-parameter limit
    const inserts = [];
    for (let i = 0; i < cards.length; i += CHUNK) {
      inserts.push(db.insert(schema.cards).values(cards.slice(i, i + CHUNK)));
    }
    try {
      await db.batch([
        db.insert(schema.cardBatches).values({
          batch_id: batchId,
          label: opts.label,
          quantity: opts.quantity,
          notes: opts.notes ?? null,
          created_by: opts.createdBy,
          manager_id: opts.managerId ?? null,
        }),
        ...inserts,
      ]);
      return { batchId, cards };
    } catch (err) {
      lastError = err;
      if (!String(err).includes("UNIQUE")) break;
    }
  }
  throw lastError;
}

export type ReserveResult =
  | { ok: true; cardId: string; managerId: string | null }
  | { ok: false; reason: "not_found" | "blocked" | "taken" | "bad_code" | "code_used" };

/** Typed activation code, normalised: " k7p2-qx " → "K7P2QX". */
export function normaliseCardCode(code: string) {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function reservationCutoff(now = Date.now()) {
  return new Date(now - RESERVATION_DAYS * 86_400_000).toISOString();
}

/**
 * RESERVED → UNCLAIMED, cancelling the card's open orders (and any cash code).
 * `onlyIfExpired` releases only reservations older than RESERVATION_DAYS.
 * Returns true when the card was released.
 */
export async function releaseCard(
  db: DB,
  cardId: string,
  { onlyIfExpired = false }: { onlyIfExpired?: boolean } = {}
) {
  const now = new Date().toISOString();
  const res = await db
    .update(schema.cards)
    .set({ status: "UNCLAIMED", user_id: null, reserved_at: null, updated_at: now })
    .where(
      and(
        eq(schema.cards.card_id, cardId),
        eq(schema.cards.status, "RESERVED"),
        onlyIfExpired ? lt(schema.cards.reserved_at, reservationCutoff()) : undefined
      )
    )
    .run();
  if (rowsAffected(res) !== 1) return false;
  await db
    .update(schema.orders)
    .set({ status: "CANCELLED", cash_code_hash: null, cash_code_expires_at: null, updated_at: now })
    .where(and(eq(schema.orders.card_id, cardId), eq(schema.orders.status, "PENDING")));
  return true;
}

/** Release every reservation older than RESERVATION_DAYS. Cheap; run on page loads. */
export async function releaseExpiredReservations(db: DB) {
  const stale = await db
    .select({ card_id: schema.cards.card_id })
    .from(schema.cards)
    .where(and(eq(schema.cards.status, "RESERVED"), lt(schema.cards.reserved_at, reservationCutoff())))
    .limit(100);
  let released = 0;
  for (const c of stale) {
    if (await releaseCard(db, c.card_id, { onlyIfExpired: true })) released++;
  }
  return released;
}

/**
 * Step 1 of activation: the signed-in user proves they bought the card by
 * typing the random activation code printed inside its packaging. The card is held for them (RESERVED) and
 * they are linked to the card's manager. Single conditional UPDATE, so two
 * people can't reserve the same card.
 */
export async function reserveCard(
  db: DB,
  token: string,
  userId: string,
  code: string
): Promise<ReserveResult> {
  const find = () =>
    db.select().from(schema.cards).where(and(eq(schema.cards.public_token, token), isNull(schema.cards.deleted_at))).get();
  let card = await find();
  if (!card) return { ok: false, reason: "not_found" };
  // Someone else's reservation ran out: free the card first.
  if (card.status === "RESERVED" && (await releaseCard(db, card.card_id, { onlyIfExpired: true }))) {
    card = (await find())!;
  }
  if (card.status === "BLOCKED") return { ok: false, reason: "blocked" };
  // Single use: once a card has been activated its code is spent for good.
  if (card.activated_at && card.user_id !== userId) return { ok: false, reason: "code_used" };
  if (!card.activation_code || normaliseCardCode(code) !== card.activation_code) {
    return { ok: false, reason: "bad_code" };
  }
  const mine = { ok: true, cardId: card.card_id, managerId: card.manager_id } as const;
  if (card.user_id === userId && card.status !== "UNCLAIMED") return mine;
  if (card.status !== "UNCLAIMED") return { ok: false, reason: "taken" };

  const now = new Date().toISOString();
  const res = await db
    .update(schema.cards)
    .set({ status: "RESERVED", user_id: userId, reserved_at: now, updated_at: now })
    .where(and(eq(schema.cards.public_token, token), eq(schema.cards.status, "UNCLAIMED")))
    .run();
  if (rowsAffected(res) !== 1) return { ok: false, reason: "taken" };

  // First manager wins: a customer stays with the manager who onboarded them.
  if (card.manager_id) {
    await db
      .update(schema.profiles)
      .set({ referred_by: card.manager_id })
      .where(and(eq(schema.profiles.user_id, userId), isNull(schema.profiles.referred_by)));
  }
  return mine;
}

export type ClaimResult =
  | { ok: true; alreadyOwned: boolean }
  | { ok: false; reason: "not_found" | "blocked" | "taken" };

/**
 * Make the card ACTIVE for `userId` (called once payment is confirmed).
 * Works from UNCLAIMED, or RESERVED by the same user. Single conditional
 * UPDATE — two concurrent claims cannot both win.
 */
export async function claimCard(
  db: DB,
  token: string,
  userId: string
): Promise<ClaimResult> {
  const now = new Date().toISOString();
  const res = await db
    .update(schema.cards)
    .set({ status: "ACTIVE", user_id: userId, activated_at: now, updated_at: now })
    .where(
      and(
        eq(schema.cards.public_token, token),
        isNull(schema.cards.activated_at),
        or(
          eq(schema.cards.status, "UNCLAIMED"),
          and(eq(schema.cards.status, "RESERVED"), eq(schema.cards.user_id, userId))
        )
      )
    )
    .run();
  if (rowsAffected(res) === 1) return { ok: true, alreadyOwned: false };

  const card = await db
    .select({ status: schema.cards.status, user_id: schema.cards.user_id })
    .from(schema.cards)
    .where(eq(schema.cards.public_token, token))
    .get();
  if (!card) return { ok: false, reason: "not_found" };
  if (card.status === "BLOCKED") return { ok: false, reason: "blocked" };
  if (card.user_id === userId && card.status === "ACTIVE") {
    return { ok: true, alreadyOwned: true };
  }
  return { ok: false, reason: "taken" };
}

/**
 * Factory read-back check. Logs every attempt and sets ONLY
 * programming_status — activation `status` is never touched.
 */
export async function recordVerification(
  db: DB,
  card: Pick<Card, "card_id" | "nfc_url">,
  readback: string,
  verifiedBy: string | null,
  deviceMeta: Record<string, unknown> = {}
) {
  const value = readback.trim();
  const success =
    value === card.nfc_url || value === card.nfc_url.replace(/^https?:\/\//, "");
  const now = new Date().toISOString();

  await db.batch([
    db.insert(schema.cardProgrammingLogs).values({
      id: crypto.randomUUID(),
      card_id: card.card_id,
      verified_by: verifiedBy,
      nfc_payload_readback: readback,
      success,
      device_meta: deviceMeta,
    }),
    db
      .update(schema.cards)
      .set(
        success
          ? { programming_status: "PROGRAMMED", programmed_at: now, updated_at: now }
          : { programming_status: "FAILED", updated_at: now }
      )
      .where(eq(schema.cards.card_id, card.card_id)),
  ]);

  return { success, programming_status: success ? "PROGRAMMED" : "FAILED" } as const;
}

/**
 * Block any card. Unblock returns it to UNCLAIMED (no owner), RESERVED
 * (owner but never paid) or ACTIVE.
 */
export async function setCardBlocked(db: DB, cardId: string, blocked: boolean) {
  const now = new Date().toISOString();
  const res = blocked
    ? await db
        .update(schema.cards)
        .set({ status: "BLOCKED", blocked_at: now, updated_at: now })
        .where(eq(schema.cards.card_id, cardId))
        .run()
    : await db
        .update(schema.cards)
        .set({
          status: sql`CASE WHEN ${schema.cards.user_id} IS NULL THEN 'UNCLAIMED' WHEN ${schema.cards.activated_at} IS NULL THEN 'RESERVED' ELSE 'ACTIVE' END`,
          blocked_at: null,
          updated_at: now,
        })
        .where(and(eq(schema.cards.card_id, cardId), eq(schema.cards.status, "BLOCKED")))
        .run();
  return rowsAffected(res) === 1;
}

export type CardView =
  | { view: "not_found" }
  | { view: "blocked"; card: Card }
  | { view: "activate"; card: Card }
  | { view: "reserved"; card: Card }
  | { view: "profile"; username: string };

/** /c/[token] routing decision. */
export function resolveCardView(
  card: Card | null,
  owner: Pick<Profile, "username"> | null
): CardView {
  if (!card) return { view: "not_found" };
  if (card.status === "BLOCKED") return { view: "blocked", card };
  if (card.status === "UNCLAIMED") return { view: "activate", card };
  if (card.status === "RESERVED") return { view: "reserved", card };
  // ACTIVE: an owner must exist; a dangling card is treated as unknown.
  if (owner?.username) return { view: "profile", username: owner.username };
  return { view: "not_found" };
}

const CSV_COLUMNS = [
  "card_id",
  "activation_code",
  "token",
  "nfc_url",
  "qr_url",
  "status",
  "programming_status",
] as const;

function csvCell(v: string) {
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function cardsToCsv(cards: Card[]) {
  const rows = cards.map((c) =>
    [c.card_id, c.activation_code ?? "", c.public_token, c.nfc_url, c.qr_url, c.status, c.programming_status]
      .map((v) => csvCell(String(v)))
      .join(",")
  );
  return [CSV_COLUMNS.join(","), ...rows].join("\r\n") + "\r\n";
}

/** D1 returns meta.changes; libsql/better-sqlite3 return rowsAffected/changes. */
export function rowsAffected(res: unknown): number {
  const r = res as {
    meta?: { changes?: number };
    rowsAffected?: number;
    changes?: number;
  };
  return r?.meta?.changes ?? r?.rowsAffected ?? r?.changes ?? 0;
}
