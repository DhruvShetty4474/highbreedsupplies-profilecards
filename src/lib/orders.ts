/**
 * Card activation orders: PENDING → PAID (UPI via Razorpay or CASH approved
 * by the manager with a one-time code). Pure functions over a Drizzle DB so
 * they run against in-memory SQLite in tests.
 *
 * Paying is the only way a card becomes ACTIVE for a customer.
 */
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { DB } from "@/db";
import * as schema from "@/db/schema";
import { claimCard, reserveSequence, rowsAffected } from "@/lib/cards";

export type Order = typeof schema.orders.$inferSelect;

export const CASH_CODE_TTL_MIN = 30;
export const CASH_CODE_MAX_ATTEMPTS = 5;

/** GST-inclusive amount → taxable value + tax, in paise. */
export function priceBreakup(amountPaise: number, gstRateBp: number) {
  const taxable = Math.round((amountPaise * 10_000) / (10_000 + gstRateBp));
  return { taxable, tax: amountPaise - taxable, total: amountPaise };
}

export function formatInr(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Indian financial year (April–March, IST): "2026-27". */
export function financialYear(d = new Date()) {
  const ist = new Date(d.getTime() + 5.5 * 3600_000);
  const y = ist.getUTCFullYear();
  const start = ist.getUTCMonth() >= 3 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

/** The open order for this card + user, created on first visit. */
export async function openOrder(
  db: DB,
  opts: {
    userId: string;
    cardId: string;
    managerId: string | null;
    amountPaise: number;
    gstRateBp: number;
  }
): Promise<Order> {
  const existing = await db
    .select()
    .from(schema.orders)
    .where(
      and(
        eq(schema.orders.card_id, opts.cardId),
        eq(schema.orders.user_id, opts.userId),
        eq(schema.orders.status, "PENDING")
      )
    )
    .get();
  if (existing) return existing;
  return db
    .insert(schema.orders)
    .values({
      id: `ord_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`,
      user_id: opts.userId,
      card_id: opts.cardId,
      manager_id: opts.managerId,
      amount_paise: opts.amountPaise,
      gst_rate_bp: opts.gstRateBp,
    })
    .returning()
    .get();
}

export type BillingDetails = {
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_gstin: string | null;
  customer_address: string;
};

/** Save the payment form and record the chosen method (PENDING only). */
export async function saveCheckout(
  db: DB,
  orderId: string,
  userId: string,
  details: BillingDetails,
  method: "UPI" | "CASH"
) {
  const now = new Date().toISOString();
  const res = await db
    .update(schema.orders)
    .set({ ...details, method, terms_accepted_at: now, updated_at: now })
    .where(
      and(
        eq(schema.orders.id, orderId),
        eq(schema.orders.user_id, userId),
        eq(schema.orders.status, "PENDING")
      )
    )
    .run();
  return rowsAffected(res) === 1;
}

/**
 * PENDING → PAID exactly once (a webhook and the browser can both report
 * the same payment). Then: invoice number, card ACTIVE. Returns false if the
 * order was already paid or doesn't exist.
 */
export async function markOrderPaid(
  db: DB,
  orderId: string,
  payment:
    | { method: "UPI"; razorpayPaymentId: string }
    | { method: "CASH"; approvedBy: string | null }
) {
  const now = new Date().toISOString();
  const res = await db
    .update(schema.orders)
    .set({
      status: "PAID",
      method: payment.method,
      paid_at: now,
      updated_at: now,
      cash_code_hash: null,
      ...(payment.method === "UPI"
        ? { razorpay_payment_id: payment.razorpayPaymentId }
        : { cash_approved_by: payment.approvedBy }),
    })
    .where(
      and(
        eq(schema.orders.id, orderId),
        // Money already moved for UPI, so a CANCELLED (expired) order is still
        // recorded as paid; the card is activated if it's free again.
        payment.method === "UPI"
          ? inArray(schema.orders.status, ["PENDING", "CANCELLED"])
          : eq(schema.orders.status, "PENDING")
      )
    )
    .run();
  if (rowsAffected(res) !== 1) return false;

  const order = (await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.id, orderId))
    .get())!;

  // Numbers are only taken once the payment is final, so there are no gaps.
  const fy = financialYear();
  const seq = await reserveSequence(db, `invoice:${fy}`, 1);
  await db
    .update(schema.orders)
    .set({ invoice_no: `HB/${fy}/${String(seq).padStart(4, "0")}` })
    .where(eq(schema.orders.id, orderId));

  const card = await db
    .select({ token: schema.cards.public_token })
    .from(schema.cards)
    .where(eq(schema.cards.card_id, order.card_id))
    .get();
  if (card) {
    const claimed = await claimCard(db, card.token, order.user_id);
    if (!claimed.ok) {
      // Paid but the card was blocked or taken by someone else meanwhile:
      // keep the payment and flag it for a manual fix or refund.
      console.error("REFUND-CHECK: paid order could not activate card", orderId, claimed.reason);
    }
  }
  return true;
}

async function hashCode(orderId: string, code: string) {
  const data = new TextEncoder().encode(`${orderId}:${code}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function sixDigits() {
  // Rejection sampling keeps every code equally likely.
  const buf = new Uint32Array(1);
  let n: number;
  do {
    crypto.getRandomValues(buf);
    n = buf[0];
  } while (n >= 4_294_000_000);
  return String(n % 1_000_000).padStart(6, "0");
}

export type CashCodeResult =
  | { ok: true; code: string; expiresAt: string }
  | { ok: false; reason: "not_found" | "forbidden" | "not_pending" | "not_cash" };

/**
 * Manager confirms they received the cash: issues a fresh one-time code the
 * customer types in. Re-issuing replaces the previous code.
 */
export async function issueCashCode(
  db: DB,
  orderId: string,
  actor: { user_id: string; role: string }
): Promise<CashCodeResult> {
  const order = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId)).get();
  if (!order) return { ok: false, reason: "not_found" };
  if (actor.role !== "admin" && actor.role !== "superadmin" && order.manager_id !== actor.user_id) {
    return { ok: false, reason: "forbidden" };
  }
  if (order.status !== "PENDING") return { ok: false, reason: "not_pending" };
  if (order.method !== "CASH") return { ok: false, reason: "not_cash" };

  const code = sixDigits();
  const expiresAt = new Date(Date.now() + CASH_CODE_TTL_MIN * 60_000).toISOString();
  await db
    .update(schema.orders)
    .set({
      cash_code_hash: await hashCode(orderId, code),
      cash_code_expires_at: expiresAt,
      cash_code_attempts: 0,
      cash_approved_by: actor.user_id,
      updated_at: new Date().toISOString(),
    })
    .where(and(eq(schema.orders.id, orderId), eq(schema.orders.status, "PENDING")));
  return { ok: true, code, expiresAt };
}

export type RedeemResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "no_code" | "expired" | "locked" | "wrong" | "already_paid" };

/** Customer types the manager's code: correct → order PAID, card ACTIVE. */
export async function redeemCashCode(
  db: DB,
  orderId: string,
  userId: string,
  code: string
): Promise<RedeemResult> {
  const order = await db
    .select()
    .from(schema.orders)
    .where(and(eq(schema.orders.id, orderId), eq(schema.orders.user_id, userId)))
    .get();
  if (!order) return { ok: false, reason: "not_found" };
  if (order.status === "PAID") return { ok: false, reason: "already_paid" };
  if (!order.cash_code_hash || !order.cash_code_expires_at) return { ok: false, reason: "no_code" };
  if (order.cash_code_attempts >= CASH_CODE_MAX_ATTEMPTS) return { ok: false, reason: "locked" };
  if (new Date(order.cash_code_expires_at).getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }

  // Count the attempt first (atomically) so parallel guesses can't skip it.
  await db
    .update(schema.orders)
    .set({ cash_code_attempts: sql`${schema.orders.cash_code_attempts} + 1` })
    .where(eq(schema.orders.id, orderId));

  const given = await hashCode(orderId, code.replace(/\D/g, ""));
  if (given !== order.cash_code_hash) return { ok: false, reason: "wrong" };

  const paid = await markOrderPaid(db, orderId, {
    method: "CASH",
    approvedBy: order.cash_approved_by,
  });
  return paid ? { ok: true } : { ok: false, reason: "already_paid" };
}

export async function fetchOrdersForManager(db: DB, managerId: string | null) {
  const q = db
    .select({
      order: schema.orders,
      username: schema.profiles.username,
      full_name: schema.profiles.full_name,
    })
    .from(schema.orders)
    .leftJoin(schema.profiles, eq(schema.profiles.user_id, schema.orders.user_id))
    .orderBy(desc(schema.orders.created_at))
    .limit(200);
  return managerId ? q.where(eq(schema.orders.manager_id, managerId)) : q;
}
