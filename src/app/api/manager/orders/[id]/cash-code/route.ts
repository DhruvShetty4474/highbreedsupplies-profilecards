import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { errorResponse } from "@/lib/api";
import { requireManager } from "@/lib/auth";
import { issueCashCode } from "@/lib/orders";

const ERRORS = {
  not_found: [404, "Order not found"],
  forbidden: [403, "This customer isn't assigned to you"],
  not_pending: [409, "This order is already paid or cancelled"],
  not_cash: [409, "The customer hasn't chosen cash for this order"],
} as const;

/** Manager received the cash → one-time code for the customer. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const profile = await requireManager();
    const { id } = await params;
    const result = await issueCashCode(getDb(), id, profile);
    if (!result.ok) {
      const [status, error] = ERRORS[result.reason];
      return NextResponse.json({ error }, { status });
    }
    return NextResponse.json({ ok: true, code: result.code, expires_at: result.expiresAt });
  } catch (err) {
    return errorResponse(err);
  }
}
