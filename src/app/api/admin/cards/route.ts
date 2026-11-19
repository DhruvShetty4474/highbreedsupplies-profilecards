import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { errorResponse } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { createBatch } from "@/lib/cards";
import { assertManager } from "@/lib/managers";
import { appUrl } from "@/lib/utils";

// No `start_sequence`: card_ids always come from the persistent counter.
const bodySchema = z.object({
  quantity: z.number().int().min(1).max(500),
  batch_label: z.string().min(2).max(120),
  notes: z.string().max(500).optional(),
  /** Manager who sells this batch; customers get referred to them. */
  manager_id: z.string().min(1).nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const profile = await requireAdmin();

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid batch payload" }, { status: 400 });
    }

    const managerId = parsed.data.manager_id ?? null;
    if (managerId && !(await assertManager(getDb(), managerId))) {
      return NextResponse.json({ error: "That user is not a manager" }, { status: 400 });
    }

    let result;
    try {
      result = await createBatch(getDb(), {
        quantity: parsed.data.quantity,
        label: parsed.data.batch_label,
        notes: parsed.data.notes,
        createdBy: profile.user_id,
        baseUrl: appUrl(),
        managerId,
      });
    } catch (err) {
      console.error("Batch creation failed", err);
      return NextResponse.json(
        { error: "Batch creation failed; nothing was saved. Please retry." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      batch_id: result.batchId,
      export_url: `/api/admin/batches/${result.batchId}/export`,
      cards: result.cards.map((c) => ({
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
