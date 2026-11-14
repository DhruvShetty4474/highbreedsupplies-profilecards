import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { getAuth } from "@/lib/auth-server";
import { fetchProfileById } from "@/lib/data";

const schemaBody = z.object({
  login_id: z.string().min(1),
  password: z.string().min(1),
});

/** Resolve "email or username" to the account email. */
async function resolveEmail(loginId: string) {
  const id = loginId.trim().toLowerCase();
  if (id.includes("@")) return id;
  const row = await getDb()
    .select({ email: schema.user.email })
    .from(schema.profiles)
    .innerJoin(schema.user, eq(schema.user.id, schema.profiles.user_id))
    .where(eq(schema.profiles.username, id))
    .get();
  return row?.email ?? null;
}

export async function POST(request: Request) {
  const parsed = schemaBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter login ID and password" }, { status: 400 });
  }

  const invalid = NextResponse.json(
    { error: "Invalid login ID or password" },
    { status: 401 }
  );

  const email = await resolveEmail(parsed.data.login_id);
  if (!email) return invalid;

  try {
    // nextCookies() plugin writes the session cookie onto this response.
    const result = await getAuth().api.signInEmail({
      body: { email, password: parsed.data.password },
      headers: request.headers,
    });
    const profile = await fetchProfileById(result.user.id);
    return NextResponse.json({
      ok: true,
      role: profile?.role ?? "client",
      username: profile?.username,
    });
  } catch {
    return invalid;
  }
}
