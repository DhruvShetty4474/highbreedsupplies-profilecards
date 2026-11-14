import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { errorResponse } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { fetchCardById } from "@/lib/data";

type Params = { params: Promise<{ card_id: string }> };

const bodySchema = z.object({
  nfc_payload_readback: z.string().min(8),
  device_meta: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Read-back verification.
 * NOTE: ported as-is; Phase 3 stops this from touching `status`.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const profile = await requireAdmin();
    const { card_id } = await params;

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid verification payload" }, { status: 400 });
    }

    const card = await fetchCardById(card_id);
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    const readback = parsed.data.nfc_payload_readback.trim();
    const success =
      readback === card.nfc_url ||
      readback === card.nfc_url.replace(/^https?:\/\//, "");

    const db = getDb();
    await db.insert(schema.cardProgrammingLogs).values({
      id: crypto.randomUUID(),
      card_id,
      verified_by: profile.user_id,
      nfc_payload_readback: parsed.data.nfc_payload_readback,
      success,
      device_meta: parsed.data.device_meta ?? {},
    });

    if (success) {
      await db
        .update(schema.cards)
        .set({
          programming_verified: true,
          programmed_at: new Date().toISOString(),
          status: "UNCLAIMED",
        })
        .where(eq(schema.cards.card_id, card_id));
    }

    return NextResponse.json({
      ok: true,
      success,
      status: success ? "UNCLAIMED" : card.status,
      programming_verified: success,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
