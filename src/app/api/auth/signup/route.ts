import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { AccountError, registerAndSignIn } from "@/lib/accounts";

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
    // Only an UNCLAIMED card can be taken; the WHERE makes it atomic.
    const res = await getDb()
      .update(schema.cards)
      .set({
        status: "ACTIVE",
        user_id: userId,
        activated_at: new Date().toISOString(),
      })
      .where(
        and(
          eq(schema.cards.public_token, parsed.data.card_token),
          eq(schema.cards.status, "UNCLAIMED")
        )
      );
    card_claimed = res.meta.changes === 1;
  }

  return NextResponse.json({ ok: true, role: "client", username, card_claimed });
}
