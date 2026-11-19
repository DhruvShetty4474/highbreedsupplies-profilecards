import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { errorResponse } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { markOrderPaid } from "@/lib/orders";
import { verifyPaymentSignature } from "@/lib/razorpay";

const bodySchema = z.object({
  razorpay_order_id: z.string().min(1).max(64),
  razorpay_payment_id: z.string().min(1).max(64),
  razorpay_signature: z.string().min(1).max(128),
});

/** Razorpay Checkout success → check the signature on the server → PAID. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const profile = await requireUser();
    const { id } = await params;
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid payment response" }, { status: 400 });
    const p = parsed.data;

    const db = getDb();
    const order = await db
      .select()
      .from(schema.orders)
      .where(and(eq(schema.orders.id, id), eq(schema.orders.user_id, profile.user_id)))
      .get();
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (order.status === "PAID") return NextResponse.json({ ok: true, already: true });

    const valid =
      order.razorpay_order_id === p.razorpay_order_id &&
      (await verifyPaymentSignature(p.razorpay_order_id, p.razorpay_payment_id, p.razorpay_signature));
    if (!valid) {
      return NextResponse.json({ error: "Payment could not be verified" }, { status: 400 });
    }

    await markOrderPaid(db, order.id, { method: "UPI", razorpayPaymentId: p.razorpay_payment_id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
