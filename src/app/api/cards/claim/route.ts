import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { claimCard } from "@/lib/cards";

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

    const result = await claimCard(getDb(), parsed.data.public_token, profile.user_id);
    if (!result.ok) {
      const map = {
        not_found: [404, "Card not found"],
        blocked: [403, "Card is blocked"],
        taken: [409, "Card already claimed"],
      } as const;
      const [status, error] = map[result.reason];
      return NextResponse.json({ error }, { status });
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
