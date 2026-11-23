import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { errorResponse } from "@/lib/api";
import { requireSuperAdmin } from "@/lib/auth";
import { recordVerification } from "@/lib/cards";
import { fetchCardById } from "@/lib/data";

type Params = { params: Promise<{ card_id: string }> };

const bodySchema = z.object({
  nfc_payload_readback: z.string().min(8).max(2048),
  device_meta: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Factory read-back verification. Sets programming_status and logs the
 * attempt. Does NOT change the card's activation status.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const profile = await requireSuperAdmin();
    const { card_id } = await params;

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid verification payload" }, { status: 400 });
    }

    const card = await fetchCardById(card_id);
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    const result = await recordVerification(
      getDb(),
      card,
      parsed.data.nfc_payload_readback,
      profile.user_id,
      parsed.data.device_meta ?? {}
    );

    return NextResponse.json({
      ok: true,
      success: result.success,
      programming_status: result.programming_status,
      status: card.status,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
