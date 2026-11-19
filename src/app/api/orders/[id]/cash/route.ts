import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { errorResponse } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { redeemCashCode } from "@/lib/orders";

const bodySchema = z.object({ code: z.string().min(6).max(10) });

const ERRORS = {
  not_found: [404, "Order not found."],
  no_code: [409, "Your manager hasn't approved this payment yet. Ask them for the code."],
  expired: [410, "That code has expired. Ask your manager for a new one."],
  locked: [429, "Too many wrong codes. Ask your manager for a new one."],
  wrong: [400, "That code is not correct."],
  already_paid: [409, "This order is already paid."],
} as const;

/** Customer enters the manager's one-time cash code → PAID, card ACTIVE. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const profile = await requireUser();
    const { id } = await params;
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Enter the 6-digit code" }, { status: 400 });
    const result = await redeemCashCode(getDb(), id, profile.user_id, parsed.data.code);
    if (!result.ok) {
      const [status, error] = ERRORS[result.reason];
      return NextResponse.json({ error }, { status });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
