import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getConfig } from "@/config";
import { getDb, schema } from "@/db";
import { markOrderPaid } from "@/lib/orders";
import { verifyWebhookSignature } from "@/lib/razorpay";

type PaymentEntity = { id: string; order_id: string; amount: number; status: string };

/**
 * Razorpay → us (server to server). Catches payments where the customer
 * closed the page before the browser confirmed. Always 200 for events we
 * don't act on, so Razorpay doesn't retry them.
 */
export async function POST(request: Request) {
  const secret = getConfig().RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });

  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (!(await verifyWebhookSignature(raw, signature, secret))) {
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }

  const event = JSON.parse(raw) as {
    event: string;
    payload?: { payment?: { entity?: PaymentEntity } };
  };
  if (event.event !== "payment.captured" && event.event !== "order.paid") {
    return NextResponse.json({ ok: true, ignored: event.event });
  }
  const payment = event.payload?.payment?.entity;
  if (!payment?.order_id) return NextResponse.json({ ok: true, ignored: "no payment" });

  const db = getDb();
  const order = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.razorpay_order_id, payment.order_id))
    .get();
  if (!order) return NextResponse.json({ ok: true, ignored: "unknown order" });
  if (payment.amount !== order.amount_paise) {
    console.error("Razorpay amount mismatch", order.id, payment.amount, order.amount_paise);
    return NextResponse.json({ ok: true, ignored: "amount mismatch" });
  }
  await markOrderPaid(db, order.id, { method: "UPI", razorpayPaymentId: payment.id });
  return NextResponse.json({ ok: true });
}
