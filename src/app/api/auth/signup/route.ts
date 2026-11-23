import { NextResponse } from "next/server";
import { z } from "zod";
import { getConfig } from "@/config";
import { getDb } from "@/db";
import { AccountError, registerAndSignIn } from "@/lib/accounts";
import { PASSWORD_RULE } from "@/lib/password-policy";
import { registrableCard } from "@/lib/access";
import { uniqueUsername } from "@/lib/auth-server";
import { captureException } from "@/lib/monitoring";
import { clientIp, hitRateLimit, LIMITS } from "@/lib/rate-limit";

// Note: no `role` field — signup can only ever create a client.
const bodySchema = z.object({
  email: z.string().email().max(254),
  /** public_token of the HighCard being activated (required). */
  card_token: z.string().max(64).optional(),
  password: z.string().min(8).max(128),
  full_name: z.string().min(2).max(120),
  /** Optional: derived from the email when left out (editable later). */
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-z0-9_]+$/i)
    .optional(),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter your name, a valid email, and a strong password. " + PASSWORD_RULE },
      { status: 400 }
    );
  }

  // Registration is only possible from a HighCard that hasn't been sold yet.
  if (!(await registrableCard(parsed.data.card_token))) {
    return NextResponse.json(
      { error: "Registration is only possible by tapping or scanning a new HighCard." },
      { status: 403 }
    );
  }

  const db = getDb();
  const limit = await hitRateLimit(
    db,
    `register:ip:${clientIp(request.headers)}`,
    LIMITS.registerPerIp.max,
    LIMITS.registerPerIp.window
  );
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many sign-ups from this network. Please try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const username =
    parsed.data.username?.toLowerCase() ?? (await uniqueUsername(db, email.split("@")[0]));

  try {
    await registerAndSignIn(
      { email, password: parsed.data.password, full_name: parsed.data.full_name, username },
      request.headers
    );
  } catch (err) {
    if (err instanceof AccountError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    void captureException(err, { route: "signup" });
    return NextResponse.json({ error: "Signup failed" }, { status: 400 });
  }

  // Cards are not claimed here: after signup the user confirms the printed
  // card code and pays on /activate/<token>.
  const verificationRequired = getConfig().REQUIRE_EMAIL_VERIFICATION;
  return NextResponse.json({
    ok: true,
    role: "client",
    username,
    email,
    /** When true, no session was created: the user must enter the emailed OTP. */
    verification_required: verificationRequired,
  });
}
