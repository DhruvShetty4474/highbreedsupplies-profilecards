import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { errorResponse } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { adminActivateCard } from "@/lib/orders";

type Params = { params: Promise<{ card_id: string }> };

/** Admin / super admin: activate an awaiting-payment card directly (cash received). */
export async function POST(_request: Request, { params }: Params) {
  try {
    const me = await requireAdmin();
    const { card_id } = await params;
    const r = await adminActivateCard(getDb(), card_id, me.user_id);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 409 });
    return NextResponse.json({ ok: true, order_id: r.orderId });
  } catch (err) {
    return errorResponse(err);
  }
}
