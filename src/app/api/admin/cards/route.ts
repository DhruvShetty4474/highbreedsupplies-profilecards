import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { errorResponse } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import {
  appUrl,
  cardNfcUrl,
  formatCardId,
  generatePublicToken,
} from "@/lib/utils";

const bodySchema = z.object({
  quantity: z.number().int().min(1).max(500),
  batch_label: z.string().min(2).max(120),
  start_sequence: z.number().int().min(1).optional(),
  notes: z.string().max(500).optional(),
});

// NOTE: Phase 3 replaces max()+1 with a persistent counter in one transaction.
export async function POST(request: Request) {
  try {
    const profile = await requireAdmin();

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid batch payload" }, { status: 400 });
    }

    const db = getDb();
    const batchId = `BATCH-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
      Math.random() * 900 + 100
    )}`;

    let start = parsed.data.start_sequence;
    if (!start) {
      const row = await db
        .select({
          max: sql<number>`coalesce(max(cast(substr(${schema.cards.card_id}, 3) as integer)), 0)`,
        })
        .from(schema.cards)
        .get();
      start = (row?.max ?? 0) + 1;
    }

    const cards = Array.from({ length: parsed.data.quantity }, (_, i) => {
      const token = generatePublicToken();
      const url = cardNfcUrl(token);
      return {
        card_id: formatCardId(start! + i),
        public_token: token,
        nfc_url: url,
        qr_url: url,
        batch_id: batchId,
      };
    });

    await db.insert(schema.cardBatches).values({
      batch_id: batchId,
      label: parsed.data.batch_label,
      quantity: parsed.data.quantity,
      notes: parsed.data.notes ?? null,
      created_by: profile.user_id,
    });
    // D1 caps bound params per statement; insert in chunks.
    for (let i = 0; i < cards.length; i += 10) {
      await db.insert(schema.cards).values(cards.slice(i, i + 10));
    }

    return NextResponse.json({
      ok: true,
      batch_id: batchId,
      cards: cards.map((c) => ({
        card_id: c.card_id,
        public_token: c.public_token,
        nfc_url: c.nfc_url,
        programming_endpoint: `${appUrl()}/api/admin/cards/${c.card_id}/programming-data`,
      })),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
