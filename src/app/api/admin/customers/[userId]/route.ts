import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { errorResponse } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { deleteUserCompletely } from "@/lib/delete-user";

const bodySchema = z.object({ confirm_username: z.string().min(1) });

/**
 * Admin: permanently delete a customer or manager. Admins and the super admin
 * can never be deleted here. The admin must type the username to confirm.
 * Paid invoices are kept; cards are blocked (active) or released (unpaid).
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const me = await requireAdmin();
    const { userId } = await params;
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Type the username to confirm" }, { status: 400 });
    }
    const db = getDb();
    const target = await db
      .select({ role: schema.profiles.role, username: schema.profiles.username })
      .from(schema.profiles)
      .where(eq(schema.profiles.user_id, userId))
      .get();
    if (!target || target.role === "admin" || target.role === "superadmin" || userId === me.user_id) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (parsed.data.confirm_username.trim().toLowerCase() !== target.username.toLowerCase()) {
      return NextResponse.json({ error: "Username doesn't match" }, { status: 400 });
    }
    await deleteUserCompletely(db, userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
