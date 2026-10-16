import { getSessionProfile } from "@/lib/auth";
import { demoCards, getDemoCardById } from "@/lib/demo-data";
import { createServiceClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/utils";
import { NextResponse } from "next/server";
import { z } from "zod";

type Params = { params: { card_id: string } };

const schema = z.object({
  nfc_payload_readback: z.string().min(8),
  device_meta: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Read-back verification: only after a successful match do we mark the card
 * as programmed while remaining UNCLAIMED for customer activation.
 */
export async function POST(request: Request, { params }: Params) {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid verification payload" }, { status: 400 });
  }

  const card = isDemoMode()
    ? getDemoCardById(params.card_id)
    : (
        await createServiceClient()
          ?.from("cards")
          .select("*")
          .eq("card_id", params.card_id)
          .maybeSingle()
      )?.data;

  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  const expected = card.nfc_url;
  const success =
    parsed.data.nfc_payload_readback.trim() === expected ||
    parsed.data.nfc_payload_readback.trim() ===
      expected.replace(/^https?:\/\//, "");

  if (isDemoMode()) {
    const idx = demoCards.findIndex((c) => c.card_id === params.card_id);
    if (idx >= 0 && success) {
      demoCards[idx] = {
        ...demoCards[idx],
        programming_verified: true,
        programmed_at: new Date().toISOString(),
        status: "UNCLAIMED",
      };
    }
    return NextResponse.json({
      ok: true,
      success,
      status: success ? "UNCLAIMED" : card.status,
      programming_verified: success,
    });
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  await supabase.from("card_programming_logs").insert({
    card_id: params.card_id,
    verified_by: profile.user_id,
    nfc_payload_readback: parsed.data.nfc_payload_readback,
    success,
    device_meta: parsed.data.device_meta ?? {},
  });

  if (success) {
    await supabase
      .from("cards")
      .update({
        programming_verified: true,
        programmed_at: new Date().toISOString(),
        status: "UNCLAIMED",
      })
      .eq("card_id", params.card_id);
  }

  return NextResponse.json({
    ok: true,
    success,
    status: success ? "UNCLAIMED" : card.status,
    programming_verified: success,
  });
}
