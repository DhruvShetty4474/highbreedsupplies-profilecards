import { getSessionProfile } from "@/lib/auth";
import { demoCards } from "@/lib/demo-data";
import { createServiceClient } from "@/lib/supabase/server";
import {
  appUrl,
  cardNfcUrl,
  formatCardId,
  generatePublicToken,
  isDemoMode,
} from "@/lib/utils";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  quantity: z.number().int().min(1).max(500),
  batch_label: z.string().min(2).max(120),
  start_sequence: z.number().int().min(1).optional(),
  notes: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid batch payload" }, { status: 400 });
  }

  const batchId = `BATCH-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
    Math.random() * 900 + 100
  )}`;

  let start = parsed.data.start_sequence;
  if (!start) {
    if (isDemoMode()) {
      start =
        Math.max(
          0,
          ...demoCards.map((c) => Number(c.card_id.replace("HB", "")) || 0)
        ) + 1;
    } else {
      start = 1;
    }
  }

  const cards = Array.from({ length: parsed.data.quantity }, (_, i) => {
    const cardId = formatCardId(start! + i);
    const token = generatePublicToken();
    const url = cardNfcUrl(token);
    return {
      card_id: cardId,
      public_token: token,
      nfc_url: url,
      qr_url: url,
      status: "UNCLAIMED" as const,
      user_id: null,
      batch_id: batchId,
      programmed_at: null,
      activated_at: null,
      blocked_at: null,
      programming_verified: false,
    };
  });

  if (isDemoMode()) {
    demoCards.push(...cards);
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
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  await supabase.from("card_batches").insert({
    batch_id: batchId,
    label: parsed.data.batch_label,
    quantity: parsed.data.quantity,
    notes: parsed.data.notes ?? null,
    created_by: profile.user_id,
  });

  const { error } = await supabase.from("cards").insert(cards);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
}
