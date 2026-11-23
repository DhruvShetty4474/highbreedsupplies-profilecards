import { and, eq, isNull, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { errorResponse } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { rowsAffected } from "@/lib/cards";

type Params = { params: Promise<{ card_id: string }> };

/**
 * Soft-delete a card: it disappears from the inventory and its link stops
 * working, but the row (and any history) is kept. An ACTIVE card must be
 * blocked first, so a paying customer's card is never removed by accident.
 */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { card_id } = await params;
    const now = new Date().toISOString();
    const res = await getDb()
      .update(schema.cards)
      .set({ deleted_at: now, updated_at: now })
      .where(
        and(
          eq(schema.cards.card_id, card_id),
          isNull(schema.cards.deleted_at),
          ne(schema.cards.status, "ACTIVE"),
          ne(schema.cards.status, "RESERVED")
        )
      )
      .run();
    if (rowsAffected(res) !== 1) {
      return NextResponse.json(
        { error: "Card not found, or it's in use. Block (or release) it first, then delete." },
        { status: 409 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
