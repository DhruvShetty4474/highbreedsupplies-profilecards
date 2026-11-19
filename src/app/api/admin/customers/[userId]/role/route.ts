import { and, eq, notInArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { errorResponse } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { rowsAffected } from "@/lib/cards";

// Admins are only created by the super admin (/api/admin/admins), never here.
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
      .where(
        and(
          eq(schema.profiles.user_id, userId),
          notInArray(schema.profiles.role, ["admin", "superadmin"])
        )
      )
      .run();
    if (rowsAffected(res) !== 1) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, role: parsed.data.role });
  } catch (err) {
    return errorResponse(err);
  }
}
