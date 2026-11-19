import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { errorResponse } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { reserveCard } from "@/lib/cards";
import { hitRateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({ code: z.string().min(3).max(20) });

const ERRORS = {
  not_found: [404, "This card link is not valid."],
  blocked: [403, "This card is disabled. Contact HIGHBREED support."],
  taken: [409, "This card is already registered to another account."],
  bad_code: [400, "That code doesn't match this card. Check the code printed on the card."],
} as const;

/** Step 1: confirm the code printed on the card → card RESERVED for me. */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const profile = await requireUser();
    const { token } = await params;
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Enter the code printed on your card" }, { status: 400 });
    }
    const db = getDb();
    // Codes are short and sequential, so cap guesses per account.
    const limit = await hitRateLimit(db, `card-code:${profile.user_id}`, 10, 3600);
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again in an hour." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
      );
    }
    const result = await reserveCard(db, token, profile.user_id, parsed.data.code);
    if (!result.ok) {
      const [status, error] = ERRORS[result.reason];
      return NextResponse.json({ error }, { status });
    }
    return NextResponse.json({ ok: true, card_id: result.cardId });
  } catch (err) {
    return errorResponse(err);
  }
}
