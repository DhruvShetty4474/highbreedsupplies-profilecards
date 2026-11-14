/**
 * Card lifecycle — pure-ish functions over a Drizzle DB so they can be unit
 * tested against an in-memory SQLite database.
 *
 *   status:             UNCLAIMED → ACTIVE (claim) ; any → BLOCKED (admin)
 *   programming_status: UNPROGRAMMED → PROGRAMMED | FAILED (factory verify)
 *
 * The two never influence each other.
 */
import { and, eq, sql } from "drizzle-orm";
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

export type ClaimResult =
  | { ok: true; alreadyOwned: boolean }
  | { ok: false; reason: "not_found" | "blocked" | "taken" };

/** Single conditional UPDATE — two concurrent claims cannot both win. */
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
      and(eq(schema.cards.public_token, token), eq(schema.cards.status, "UNCLAIMED"))
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
  if (card.user_id === userId) return { ok: true, alreadyOwned: true };
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

/** Block any card; unblock returns it to ACTIVE (if owned) or UNCLAIMED. */
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
          status: sql`CASE WHEN ${schema.cards.user_id} IS NULL THEN 'UNCLAIMED' ELSE 'ACTIVE' END`,
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
  | { view: "profile"; username: string };

/** /c/[token] routing decision. */
export function resolveCardView(
  card: Card | null,
  owner: Pick<Profile, "username"> | null
): CardView {
  if (!card) return { view: "not_found" };
  if (card.status === "BLOCKED") return { view: "blocked", card };
  if (card.status === "UNCLAIMED") return { view: "activate", card };
  // ACTIVE: an owner must exist; a dangling card is treated as unknown.
  if (owner?.username) return { view: "profile", username: owner.username };
  return { view: "not_found" };
}

const CSV_COLUMNS = [
  "card_id",
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
    [c.card_id, c.public_token, c.nfc_url, c.qr_url, c.status, c.programming_status]
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
