/**
 * HIGHBREED — D1 (SQLite) schema.
 *
 * Better Auth tables: user, session, account, verification, rate_limit.
 * App tables: profiles, card_batches, cards, leads, card_programming_logs.
 *
 * App timestamps are ISO-8601 strings (matches the UI's `string` types);
 * Better Auth timestamps use Drizzle's integer timestamp mode.
 */
import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import type {
  ContentBlock,
  ProfileLayout,
  SocialLink,
} from "@/lib/types";

const nowIso = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

// ---------------------------------------------------------------------------
// Better Auth
// ---------------------------------------------------------------------------
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("idx_session_user").on(t.userId)]
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("idx_account_user").on(t.userId)]
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }),
  },
  (t) => [index("idx_verification_identifier").on(t.identifier)]
);

/** Better Auth database-backed rate limiting (Workers share no memory). */
export const rateLimit = sqliteTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: integer("last_request").notNull(),
});

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
export const profiles = sqliteTable(
  "profiles",
  {
    user_id: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    username: text("username").notNull().unique(),
    full_name: text("full_name").notNull().default(""),
    designation: text("designation").notNull().default(""),
    location: text("location").notNull().default(""),
    bio: text("bio").notNull().default(""),
    avatar_url: text("avatar_url"),
    banner_url: text("banner_url"),
    video_url: text("video_url"),
    phone: text("phone"),
    email: text("email"),
    social_links: text("social_links", { mode: "json" })
      .$type<SocialLink[]>()
      .notNull()
      .default(sql`'[]'`),
    content_blocks: text("content_blocks", { mode: "json" })
      .$type<ContentBlock[]>()
      .notNull()
      .default(sql`'[]'`),
    layout: text("layout", { mode: "json" }).$type<ProfileLayout>(),
    theme: text("theme", { mode: "json" }).$type<{
      accent?: string;
      surface?: string;
    }>(),
    role: text("role", { enum: ["admin", "manager", "client"] })
      .notNull()
      .default("client"),
    /** Manager who referred this customer (set when their card is reserved). */
    referred_by: text("referred_by"),
    // Share page preferences (previously in-memory)
    share_offline: integer("share_offline", { mode: "boolean" })
      .notNull()
      .default(false),
    quick_share: text("quick_share", { enum: ["text", "email"] }),
    // Lightweight counters (previously in-memory)
    stat_reaches: integer("stat_reaches").notNull().default(0),
    stat_shares: integer("stat_shares").notNull().default(0),
    stat_contact_saves: integer("stat_contact_saves").notNull().default(0),
    created_at: text("created_at").notNull().default(nowIso),
    updated_at: text("updated_at").notNull().default(nowIso),
  },
  (t) => [
    index("idx_profiles_role").on(t.role),
    index("idx_profiles_referred_by").on(t.referred_by),
  ]
);

export const cardBatches = sqliteTable("card_batches", {
  batch_id: text("batch_id").primaryKey(),
  label: text("label").notNull(),
  quantity: integer("quantity").notNull(),
  notes: text("notes"),
  /** Manager who sells this batch; copied onto each card. */
  manager_id: text("manager_id").references(() => profiles.user_id, {
    onDelete: "set null",
  }),
  created_by: text("created_by").references(() => profiles.user_id, {
    onDelete: "set null",
  }),
  created_at: text("created_at").notNull().default(nowIso),
});

export const cards = sqliteTable(
  "cards",
  {
    card_id: text("card_id").primaryKey(),
    public_token: text("public_token").notNull().unique(),
    nfc_url: text("nfc_url").notNull(),
    qr_url: text("qr_url").notNull(),
    nfc_uid: text("nfc_uid"),
    /** UNCLAIMED → RESERVED (registered, awaiting payment) → ACTIVE (paid). */
    status: text("status", {
      enum: ["UNCLAIMED", "RESERVED", "ACTIVE", "BLOCKED"],
    })
      .notNull()
      .default("UNCLAIMED"),
    user_id: text("user_id").references(() => profiles.user_id, {
      onDelete: "set null",
    }),
    batch_id: text("batch_id").references(() => cardBatches.batch_id, {
      onDelete: "set null",
    }),
    /** Random code printed inside the packaging; proves the buyer opened a sold card. */
    activation_code: text("activation_code"),
    /** When the card was RESERVED; unpaid reservations expire. */
    reserved_at: text("reserved_at"),
    /** Manager who gets the referral when this card is activated. */
    manager_id: text("manager_id").references(() => profiles.user_id, {
      onDelete: "set null",
    }),
    programmed_at: text("programmed_at"),
    activated_at: text("activated_at"),
    blocked_at: text("blocked_at"),
    /** Factory NFC write state — independent of activation `status`. */
    programming_status: text("programming_status", {
      enum: ["UNPROGRAMMED", "PROGRAMMED", "FAILED"],
    })
      .notNull()
      .default("UNPROGRAMMED"),
    created_at: text("created_at").notNull().default(nowIso),
    updated_at: text("updated_at").notNull().default(nowIso),
  },
  (t) => [
    index("idx_cards_status").on(t.status),
    index("idx_cards_user").on(t.user_id),
    index("idx_cards_batch").on(t.batch_id),
    index("idx_cards_manager").on(t.manager_id),
  ]
);

/** Persistent sequences (e.g. card_id) — never reused, never reset. */
export const counters = sqliteTable("counters", {
  name: text("name").primaryKey(),
  value: integer("value").notNull().default(0),
});

export const leads = sqliteTable(
  "leads",
  {
    id: text("id").primaryKey(),
    cardholder_user_id: text("cardholder_user_id")
      .notNull()
      .references(() => profiles.user_id, { onDelete: "cascade" }),
    visitor_name: text("visitor_name").notNull(),
    visitor_email: text("visitor_email"),
    visitor_phone: text("visitor_phone"),
    visitor_note: text("visitor_note"),
    source_card_id: text("source_card_id").references(() => cards.card_id, {
      onDelete: "set null",
    }),
    created_at: text("created_at").notNull().default(nowIso),
  },
  (t) => [index("idx_leads_cardholder").on(t.cardholder_user_id, t.created_at)]
);

export const cardProgrammingLogs = sqliteTable("card_programming_logs", {
  id: text("id").primaryKey(),
  card_id: text("card_id")
    .notNull()
    .references(() => cards.card_id, { onDelete: "cascade" }),
  verified_by: text("verified_by").references(() => profiles.user_id, {
    onDelete: "set null",
  }),
  nfc_payload_readback: text("nfc_payload_readback").notNull(),
  success: integer("success", { mode: "boolean" }).notNull().default(false),
  device_meta: text("device_meta", { mode: "json" })
    .$type<Record<string, unknown>>()
    .notNull()
    .default(sql`'{}'`),
  created_at: text("created_at").notNull().default(nowIso),
});

/**
 * Every object a user stores in R2. `size` counts toward
 * MEDIA_QUOTA_MB_PER_USER (pending uploads reserve their declared size).
 */
export const media = sqliteTable(
  "media",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    key: text("key").notNull().unique(),
    url: text("url").notNull().unique(),
    kind: text("kind", { enum: ["avatar", "banner", "image", "video"] }).notNull(),
    content_type: text("content_type").notNull(),
    size: integer("size").notNull(),
    status: text("status", { enum: ["pending", "ready"] })
      .notNull()
      .default("pending"),
    created_at: text("created_at").notNull().default(nowIso),
  },
  (t) => [index("idx_media_user").on(t.user_id, t.status)]
);

/**
 * One order per card activation. Money is stored in paise (integers).
 * PENDING → PAID (UPI via Razorpay, or CASH approved by the manager).
 */
export const orders = sqliteTable(
  "orders",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    card_id: text("card_id")
      .notNull()
      .references(() => cards.card_id, { onDelete: "cascade" }),
    manager_id: text("manager_id").references(() => profiles.user_id, {
      onDelete: "set null",
    }),
    status: text("status", { enum: ["PENDING", "PAID", "CANCELLED"] })
      .notNull()
      .default("PENDING"),
    /** Chosen at checkout. CASH = waiting for the manager's code. */
    method: text("method", { enum: ["UPI", "CASH"] }),
    /** Price including GST, frozen when the order is created. */
    amount_paise: integer("amount_paise").notNull(),
    /** GST rate in basis points (1800 = 18%). */
    gst_rate_bp: integer("gst_rate_bp").notNull(),
    // Billing details from the payment form
    customer_name: text("customer_name").notNull().default(""),
    customer_phone: text("customer_phone").notNull().default(""),
    customer_email: text("customer_email").notNull().default(""),
    customer_gstin: text("customer_gstin"),
    customer_address: text("customer_address").notNull().default(""),
    terms_accepted_at: text("terms_accepted_at"),
    // Razorpay (UPI)
    razorpay_order_id: text("razorpay_order_id").unique(),
    razorpay_payment_id: text("razorpay_payment_id").unique(),
    // Cash: one-time code from the manager (SHA-256, never stored plain)
    cash_code_hash: text("cash_code_hash"),
    cash_code_expires_at: text("cash_code_expires_at"),
    cash_code_attempts: integer("cash_code_attempts").notNull().default(0),
    cash_approved_by: text("cash_approved_by").references(() => profiles.user_id, {
      onDelete: "set null",
    }),
    /** e.g. HB/2026-27/0001 — assigned once, when paid. */
    invoice_no: text("invoice_no").unique(),
    paid_at: text("paid_at"),
    created_at: text("created_at").notNull().default(nowIso),
    updated_at: text("updated_at").notNull().default(nowIso),
  },
  (t) => [
    index("idx_orders_user").on(t.user_id),
    index("idx_orders_card").on(t.card_id, t.status),
    index("idx_orders_manager").on(t.manager_id, t.status),
  ]
);

/** Admin-editable settings (price, GST, seller details on invoices). */
export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updated_at: text("updated_at").notNull().default(nowIso),
});
