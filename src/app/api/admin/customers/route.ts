import { NextResponse } from "next/server";
import { z } from "zod";
import { AccountError, createAccountAsAdmin } from "@/lib/accounts";
import { errorResponse } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { fetchClientProfiles } from "@/lib/data";

const createSchema = z.object({
  /** Becomes the username; customers can sign in with it or their email. */
  login_id: z.string().min(3).max(32).regex(/^[a-z0-9_]+$/i),
  password: z.string().min(8),
  username: z.string().min(3).max(32).regex(/^[a-z0-9_]+$/i).optional(),
  full_name: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  designation: z.string().optional(),
});

export async function GET() {
  try {
    await requireAdmin();
    const customers = (await fetchClientProfiles()).map((p) => ({
      user_id: p.user_id,
      login_id: p.username,
      username: p.username,
      full_name: p.full_name,
      email: p.email,
      phone: p.phone,
      designation: p.designation,
    }));
    return NextResponse.json({ customers });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const parsed = createSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid customer payload" }, { status: 400 });
    }
    const d = parsed.data;
    const username = (d.username || d.login_id).toLowerCase();
    // Auth needs an email; without one, use a non-deliverable placeholder.
    const email = (d.email || `${username}@customers.highbreed.invalid`).toLowerCase();

    try {
      const userId = await createAccountAsAdmin({
        email,
        password: d.password,
        full_name: d.full_name,
        username,
        phone: d.phone,
        designation: d.designation,
      });
      return NextResponse.json({
        ok: true,
        customer: { user_id: userId, login_id: username, username, full_name: d.full_name },
      });
    } catch (err) {
      if (err instanceof AccountError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      throw err;
    }
  } catch (err) {
    return errorResponse(err);
  }
}
