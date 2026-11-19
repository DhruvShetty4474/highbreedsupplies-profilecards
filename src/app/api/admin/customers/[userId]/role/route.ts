import { and, eq, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { errorResponse } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { rowsAffected } from "@/lib/cards";

// Admin is only granted via ADMIN_EMAILS / admin:grant, never through here.
const bodySchema = z.object({ role: z.enum(["manager", "client"]) });

export async function POST(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    await requireAdmin();
    const { userId } = await params;
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    const res = await getDb()
      .update(schema.profiles)
      .set({ role: parsed.data.role, updated_at: new Date().toISOString() })
      .where(and(eq(schema.profiles.user_id, userId), ne(schema.profiles.role, "admin")))
      .run();
    if (rowsAffected(res) !== 1) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, role: parsed.data.role });
  } catch (err) {
    return errorResponse(err);
  }
}
