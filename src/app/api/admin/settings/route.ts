import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { errorResponse } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { GSTIN_RE } from "@/lib/billing";
import { saveSettings } from "@/lib/settings";

const bodySchema = z.object({
  card_price_inr: z.coerce.number().min(0).max(100_000),
  gst_rate_percent: z.coerce.number().min(0).max(28),
  seller_name: z.string().trim().min(2).max(120),
  seller_gstin: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => v === "" || GSTIN_RE.test(v), "GSTIN should look like 27ABCDE1234F1Z5"),
  seller_address: z.string().trim().max(500),
  seller_phone: z.string().trim().max(40),
  seller_email: z.string().trim().max(254),
  hsn_code: z.string().trim().max(12),
  terms_text: z.string().trim().min(10, "Terms must be at least 10 characters").max(2000),
});

/** Business settings: card price, GST and the seller block on invoices. */
export async function POST(request: Request) {
  try {
    await requireAdmin();
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid settings" },
        { status: 400 }
      );
    }
    await saveSettings(getDb(), parsed.data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
