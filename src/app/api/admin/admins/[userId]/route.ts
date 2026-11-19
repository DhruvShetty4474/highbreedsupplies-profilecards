import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { errorResponse } from "@/lib/api";
import { requireSuperAdmin } from "@/lib/auth";
import { rowsAffected } from "@/lib/cards";

/** Super admin: remove admin rights (the account becomes a normal customer). */
export async function DELETE(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    await requireSuperAdmin();
    const { userId } = await params;
    const db = getDb();
    const res = await db
      .update(schema.profiles)
      .set({ role: "client", updated_at: new Date().toISOString() })
      .where(and(eq(schema.profiles.user_id, userId), eq(schema.profiles.role, "admin")))
      .run();
    if (rowsAffected(res) !== 1) return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    // Sign them out everywhere so the old admin session stops working now.
    await db.delete(schema.session).where(eq(schema.session.userId, userId));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
