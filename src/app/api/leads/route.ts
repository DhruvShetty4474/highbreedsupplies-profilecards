import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { fetchCardById, fetchProfileById } from "@/lib/data";
import { clientIp, hitRateLimit, LIMITS } from "@/lib/rate-limit";

const bodySchema = z.object({
  cardholder_user_id: z.string().min(1),
  visitor_name: z.string().min(1).max(120),
  visitor_email: z.string().email().optional().or(z.literal("")),
  visitor_phone: z.string().max(40).optional().or(z.literal("")),
  visitor_note: z.string().max(1000).optional().or(z.literal("")),
  source_card_id: z.string().optional(),
});

/** Public: visitor submits their details to a cardholder. */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid lead payload" }, { status: 400 });
  }

  // Public form: cap submissions per visitor IP to stop lead spam.
  const limit = await hitRateLimit(
    getDb(),
    `lead:ip:${clientIp(request.headers)}`,
    LIMITS.leadPerIp.max,
    LIMITS.leadPerIp.window
  );
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  if (!(await fetchProfileById(parsed.data.cardholder_user_id))) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  await getDb().insert(schema.leads).values({
    id: crypto.randomUUID(),
    cardholder_user_id: parsed.data.cardholder_user_id,
    visitor_name: parsed.data.visitor_name.trim(),
    visitor_email: parsed.data.visitor_email || null,
    visitor_phone: parsed.data.visitor_phone || null,
    visitor_note: parsed.data.visitor_note || null,
    // Only keep the source card if it really belongs to this cardholder.
    source_card_id:
      parsed.data.source_card_id &&
      (await fetchCardById(parsed.data.source_card_id))?.user_id ===
        parsed.data.cardholder_user_id
        ? parsed.data.source_card_id
        : null,
  });

  return NextResponse.json({ ok: true });
}
