import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { TOKEN_RE } from "@/lib/cards";
import { fetchCardByToken } from "@/lib/data";

const bodySchema = z.object({
  public_token: z.string().min(6).max(64),
});

/**
 * "Add a card" from the dashboard. Cards are only activated by paying, so
 * this just validates the token and sends the user to /activate/<token>.
 */
export async function POST(request: Request) {
  try {
    const profile = await requireUser();
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    const token = parsed.success ? parsed.data.public_token.trim() : "";
    const card = TOKEN_RE.test(token) ? await fetchCardByToken(token) : null;
    if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });
    if (card.status === "BLOCKED") return NextResponse.json({ error: "Card is blocked" }, { status: 403 });
    if (card.user_id && card.user_id !== profile.user_id) {
      return NextResponse.json({ error: "Card already claimed" }, { status: 409 });
    }
    return NextResponse.json({ ok: true, redirect: `/activate/${card.public_token}` });
  } catch (err) {
    return errorResponse(err);
  }
}
