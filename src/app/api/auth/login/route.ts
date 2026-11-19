import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { getAuth } from "@/lib/auth-server";
import { fetchProfileById } from "@/lib/data";
import { clientIp, hitRateLimit, LIMITS } from "@/lib/rate-limit";

const bodySchema = z.object({
  login_id: z.string().min(1).max(254),
  password: z.string().min(1).max(128),
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

function tooMany(retryAfter: number) {
  return NextResponse.json(
    { error: "Too many sign-in attempts. Please wait and try again." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter login ID and password" }, { status: 400 });
  }

  const db = getDb();
  const ip = await hitRateLimit(
    db,
    `login:ip:${clientIp(request.headers)}`,
    LIMITS.loginPerIp.max,
    LIMITS.loginPerIp.window
  );
  if (!ip.ok) return tooMany(ip.retryAfter);
  // Per-account limit slows password guessing spread over many IPs.
  const acct = await hitRateLimit(
    db,
    `login:acct:${parsed.data.login_id.trim().toLowerCase()}`,
    LIMITS.loginPerAccount.max,
    LIMITS.loginPerAccount.window
  );
  if (!acct.ok) return tooMany(acct.retryAfter);

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
  } catch (err) {
    const code = (err as { body?: { code?: string } })?.body?.code;
    if (code === "EMAIL_NOT_VERIFIED") {
      return NextResponse.json(
        {
          // Only reached with the right password, so returning the email
          // (needed when they signed in by username) reveals nothing new.
          error: "Please verify your email first — we've emailed you a new code.",
          code,
          email,
        },
        { status: 403 }
      );
    }
    return invalid;
  }
}
