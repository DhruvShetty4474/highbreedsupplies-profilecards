import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { AccountError, createAccountAsAdmin } from "@/lib/accounts";
import { errorResponse } from "@/lib/api";
import { requireSuperAdmin } from "@/lib/auth";
import { uniqueUsername } from "@/lib/auth-server";

const createSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  /** Only needed when the email has no account yet. */
  password: z.string().min(8).max(128).optional(),
});

/** Super admin: list admins (the super admin itself is never listed). */
export async function GET() {
  try {
    await requireSuperAdmin();
    const admins = await getDb()
      .select({
        user_id: schema.profiles.user_id,
        full_name: schema.profiles.full_name,
        email: schema.user.email,
      })
      .from(schema.profiles)
      .innerJoin(schema.user, eq(schema.user.id, schema.profiles.user_id))
      .where(eq(schema.profiles.role, "admin"));
    return NextResponse.json({ admins });
  } catch (err) {
    return errorResponse(err);
  }
}

/**
 * Super admin: make someone an admin. Promotes an existing account, or
 * creates a new (already verified) account with the given password.
 */
export async function POST(request: Request) {
  try {
    await requireSuperAdmin();
    const parsed = createSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Enter a name, a valid email and (for a new account) a password of 8+ characters" },
        { status: 400 }
      );
    }
    const { full_name, email, password } = parsed.data;
    const db = getDb();
    const existing = await db
      .select({ id: schema.user.id, role: schema.profiles.role })
      .from(schema.user)
      .innerJoin(schema.profiles, eq(schema.profiles.user_id, schema.user.id))
      .where(eq(schema.user.email, email))
      .get();

    if (existing) {
      if (existing.role === "superadmin" || existing.role === "admin") {
        return NextResponse.json({ error: "That account is already an admin" }, { status: 409 });
      }
      await db
        .update(schema.profiles)
        .set({ role: "admin", updated_at: new Date().toISOString() })
        .where(eq(schema.profiles.user_id, existing.id));
      return NextResponse.json({ ok: true, promoted: true });
    }

    if (!password) {
      return NextResponse.json({ error: "No account with that email — set a password to create one" }, { status: 400 });
    }
    let userId: string;
    try {
      userId = await createAccountAsAdmin(
        { email, password, full_name, username: await uniqueUsername(db, email.split("@")[0]) },
        { emailVerified: true }
      );
    } catch (err) {
      if (err instanceof AccountError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      throw err;
    }
    await db
      .update(schema.profiles)
      .set({ role: "admin", email })
      .where(eq(schema.profiles.user_id, userId));
    return NextResponse.json({ ok: true, created: true });
  } catch (err) {
    return errorResponse(err);
  }
}
