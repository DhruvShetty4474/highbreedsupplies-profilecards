/**
 * Admin-editable business settings (Admin → Settings), stored in D1's
 * app_settings table. Price and seller details are printed on invoices.
 */
import { inArray, sql } from "drizzle-orm";
import type { DB } from "@/db";
import * as schema from "@/db/schema";

export type BusinessSettings = {
  /** Card price in rupees, GST included. 0 = payments switched off. */
  card_price_inr: number;
  /** GST rate in percent (18 for NFC cards). */
  gst_rate_percent: number;
  seller_name: string;
  seller_gstin: string;
  seller_address: string;
  seller_phone: string;
  seller_email: string;
  /** HSN code printed on the invoice (8523 52 = smart cards). */
  hsn_code: string;
  /** Short terms shown next to the checkbox on the payment page. */
  terms_text: string;
  /** Days a user who registered without a card can use the site for free. */
  free_trial_days: number;
};

export const DEFAULT_SETTINGS: BusinessSettings = {
  card_price_inr: 0,
  gst_rate_percent: 18,
  seller_name: "HIGHBREED SUPPLIES",
  seller_gstin: "",
  seller_address: "",
  seller_phone: "",
  seller_email: "",
  hsn_code: "852352",
  terms_text:
    "Payment is for one HIGHBREED NFC HighCard and its digital profile. " +
    "Cards are non-refundable once activated. Replacement cards are charged separately.",
  free_trial_days: 7,
};

const KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof BusinessSettings)[];
const NUMERIC = new Set<keyof BusinessSettings>(["card_price_inr", "gst_rate_percent", "free_trial_days"]);

export async function getSettings(db: DB): Promise<BusinessSettings> {
  const rows = await db
    .select()
    .from(schema.appSettings)
    .where(inArray(schema.appSettings.key, KEYS));
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const r of rows) {
    const k = r.key as keyof BusinessSettings;
    out[k] = NUMERIC.has(k) ? Number(r.value) || 0 : r.value;
  }
  return out as BusinessSettings;
}

export async function saveSettings(db: DB, patch: Partial<BusinessSettings>) {
  const now = new Date().toISOString();
  const writes = Object.entries(patch)
    .filter(([k, v]) => KEYS.includes(k as keyof BusinessSettings) && v !== undefined)
    .map(([key, v]) =>
      db
        .insert(schema.appSettings)
        .values({ key, value: String(v), updated_at: now })
        .onConflictDoUpdate({
          target: schema.appSettings.key,
          set: { value: sql`excluded.value`, updated_at: now },
        })
    );
  if (writes.length) await db.batch(writes as [(typeof writes)[0], ...typeof writes]);
}
