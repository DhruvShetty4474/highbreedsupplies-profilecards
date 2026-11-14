import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { fetchCardByToken } from "@/lib/data";

const bodySchema = z.object({
  public_token: z.string().min(6),
});

export async function POST(request: Request) {
  try {
    const profile = await requireUser();

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }
    const token = parsed.data.public_token;

    // Atomic: only flips a card that is still UNCLAIMED.
    const res = await getDb()
      .update(schema.cards)
      .set({
        status: "ACTIVE",
        user_id: profile.user_id,
        activated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .where(
        and(
          eq(schema.cards.public_token, token),
          eq(schema.cards.status, "UNCLAIMED")
        )
      );

    if (res.meta.changes !== 1) {
      const card = await fetchCardByToken(token);
      if (!card) {
        return NextResponse.json({ error: "Card not found" }, { status: 404 });
      }
      if (card.status === "BLOCKED") {
        return NextResponse.json({ error: "Card is blocked" }, { status: 403 });
      }
      if (card.user_id !== profile.user_id) {
        return NextResponse.json({ error: "Card already claimed" }, { status: 409 });
      }
      // Already ours — idempotent success.
    }

    return NextResponse.json({
      ok: true,
      username: profile.username,
      redirect: `/${profile.username}`,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
