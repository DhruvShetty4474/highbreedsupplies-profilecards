import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getConfig } from "@/config";
import { getDb, schema } from "@/db";
import { errorResponse } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { checkoutSchema } from "@/lib/billing";
import { openOrder, saveCheckout } from "@/lib/orders";
import { createRazorpayOrder } from "@/lib/razorpay";
import { getSettings } from "@/lib/settings";

/**
 * Step 2: save the payment form and start payment.
 *   UPI  → returns Razorpay Checkout options
 *   CASH → the order waits for the manager's one-time code
 */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const profile = await requireUser();
    const { token } = await params;
    const parsed = checkoutSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Check the form" },
        { status: 400 }
      );
    }
    const input = parsed.data;
    const config = getConfig();
    if (input.method === "UPI" && !config.features.razorpay) {
      return NextResponse.json({ error: "UPI payments are not available yet. Choose Cash." }, { status: 503 });
    }

    const db = getDb();
    const card = await db
      .select()
      .from(schema.cards)
      .where(
        and(
          eq(schema.cards.public_token, token),
          eq(schema.cards.user_id, profile.user_id),
          eq(schema.cards.status, "RESERVED")
        )
      )
      .get();
    if (!card) {
      return NextResponse.json({ error: "Confirm your card code first." }, { status: 409 });
    }

    const settings = await getSettings(db);
    if (settings.card_price_inr <= 0) {
      return NextResponse.json(
        { error: "Payments are not set up yet. Please contact your manager." },
        { status: 503 }
      );
    }

    const order = await openOrder(db, {
      userId: profile.user_id,
      cardId: card.card_id,
      managerId: card.manager_id,
      amountPaise: Math.round(settings.card_price_inr * 100),
      gstRateBp: Math.round(settings.gst_rate_percent * 100),
    });
    await saveCheckout(
      db,
      order.id,
      profile.user_id,
      {
        customer_name: input.name,
        customer_phone: input.phone,
        customer_email: input.email,
        customer_gstin: input.gstin,
        customer_address: input.address,
      },
      input.method
    );

    if (input.method === "CASH") {
      return NextResponse.json({ ok: true, order_id: order.id, method: "CASH" });
    }

    // One Razorpay order per our order (re-used if the customer retries).
    let rzpOrderId = order.razorpay_order_id;
    if (!rzpOrderId) {
      const rzp = await createRazorpayOrder({
        amountPaise: order.amount_paise,
        receipt: order.id,
        notes: { order_id: order.id, card_id: card.card_id },
      });
      rzpOrderId = rzp.id;
      await db
        .update(schema.orders)
        .set({ razorpay_order_id: rzpOrderId })
        .where(eq(schema.orders.id, order.id));
    }

    return NextResponse.json({
      ok: true,
      order_id: order.id,
      method: "UPI",
      razorpay: {
        key: config.RAZORPAY_KEY_ID,
        order_id: rzpOrderId,
        amount: order.amount_paise,
        currency: "INR",
        name: settings.seller_name,
        description: `HighCard ${card.card_id}`,
        prefill: { name: input.name, email: input.email, contact: input.phone },
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
