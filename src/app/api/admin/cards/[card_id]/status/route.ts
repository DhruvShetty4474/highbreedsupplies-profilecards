import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { errorResponse } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { setCardBlocked } from "@/lib/cards";
import { fetchCardById } from "@/lib/data";

type Params = { params: Promise<{ card_id: string }> };

const bodySchema = z.object({ action: z.enum(["block", "unblock"]) });

/** Admin: block or unblock a card. */
export async function POST(request: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { card_id } = await params;
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const changed = await setCardBlocked(getDb(), card_id, parsed.data.action === "block");
    const card = await fetchCardById(card_id);
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, changed, status: card.status });
  } catch (err) {
    return errorResponse(err);
  }
}
