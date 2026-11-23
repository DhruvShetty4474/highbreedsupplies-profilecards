import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { errorResponse } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getAuth } from "@/lib/auth-server";
import { softDeleteUser } from "@/lib/delete-user";

const bodySchema = z.object({ password: z.string().min(1).max(128) });

/** A user deletes their own account (soft delete; password required). */
export async function POST(request: Request) {
  try {
    const me = await requireUser();
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Enter your password" }, { status: 400 });
    try {
      await getAuth().api.verifyPassword({ body: { password: parsed.data.password }, headers: await headers() });
    } catch {
      return NextResponse.json({ error: "Password is incorrect" }, { status: 400 });
    }
    await softDeleteUser(getDb(), me.user_id);
    const res = NextResponse.json({ ok: true });
    for (const name of ["better-auth.session_token", "__Secure-better-auth.session_token"]) {
      res.cookies.set(name, "", { maxAge: 0, path: "/" });
    }
    return res;
  } catch (err) {
    return errorResponse(err);
  }
}
