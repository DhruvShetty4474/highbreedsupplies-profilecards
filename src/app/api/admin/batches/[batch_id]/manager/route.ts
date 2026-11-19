import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { errorResponse } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { assertManager } from "@/lib/managers";

const bodySchema = z.object({ manager_id: z.string().min(1).nullable() });

/**
 * Re-assign a batch to another manager. Only cards nobody has registered
 * yet move; customers already onboarded stay with their manager.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ batch_id: string }> }
) {
  try {
    await requireAdmin();
    const { batch_id } = await params;
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid manager" }, { status: 400 });
    const managerId = parsed.data.manager_id;
    const db = getDb();
    if (managerId && !(await assertManager(db, managerId))) {
      return NextResponse.json({ error: "That user is not a manager" }, { status: 400 });
    }
    await db.batch([
      db
        .update(schema.cardBatches)
        .set({ manager_id: managerId })
        .where(eq(schema.cardBatches.batch_id, batch_id)),
      db
        .update(schema.cards)
        .set({ manager_id: managerId, updated_at: new Date().toISOString() })
        .where(and(eq(schema.cards.batch_id, batch_id), eq(schema.cards.status, "UNCLAIMED"))),
    ]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
