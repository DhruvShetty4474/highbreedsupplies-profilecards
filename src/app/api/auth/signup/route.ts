import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { AccountError, registerAndSignIn } from "@/lib/accounts";
import { claimCard } from "@/lib/cards";

// Note: no `role` field — signup can only ever create a client.
const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(2),
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-z0-9_]+$/i),
  card_token: z.string().optional(),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a valid name, username, email, and password (8+ chars)" },
      { status: 400 }
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
    console.error(err);
    return NextResponse.json({ error: "Signup failed" }, { status: 400 });
  }

  let card_claimed = false;
  if (parsed.data.card_token) {
    const result = await claimCard(getDb(), parsed.data.card_token, userId);
    card_claimed = result.ok;
  }

  return NextResponse.json({ ok: true, role: "client", username, card_claimed });
}
