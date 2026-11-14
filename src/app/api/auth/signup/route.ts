import { NextResponse } from "next/server";
import { z } from "zod";
import { getConfig } from "@/config";
import { getDb } from "@/db";
import { AccountError, registerAndSignIn } from "@/lib/accounts";
import { claimCard } from "@/lib/cards";
import { captureException } from "@/lib/monitoring";
import { clientIp, hitRateLimit, LIMITS } from "@/lib/rate-limit";

// Note: no `role` field — signup can only ever create a client.
const bodySchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  full_name: z.string().min(2).max(120),
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-z0-9_]+$/i),
  /** Card activation: token from /c/<token>, claimed right after signup. */
  card_token: z.string().max(64).optional(),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a valid name, username, email, and password (8+ chars)" },
      { status: 400 }
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

  const username = parsed.data.username.toLowerCase();
  const email = parsed.data.email.trim().toLowerCase();

  let userId: string;
  try {
    userId = await registerAndSignIn(
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

  let card_claimed = false;
  let card_error: string | undefined;
  if (parsed.data.card_token) {
    const result = await claimCard(db, parsed.data.card_token, userId);
    card_claimed = result.ok;
    if (!result.ok) {
      card_error =
        result.reason === "taken"
          ? "That card was already activated by someone else."
          : result.reason === "blocked"
            ? "That card is disabled. Contact HIGHBREED support."
            : "That card link is not valid.";
    }
  }

  const verificationRequired = getConfig().REQUIRE_EMAIL_VERIFICATION;
  return NextResponse.json({
    ok: true,
    role: "client",
    username,
    card_claimed,
    card_error,
    /** When true, no session was created: the user must click the email link. */
    verification_required: verificationRequired,
  });
}
