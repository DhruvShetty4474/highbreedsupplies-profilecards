/**
 * Razorpay over plain fetch + WebCrypto (works on Workers, no SDK).
 *
 *   1. Server creates a Razorpay order for the exact amount  (createRazorpayOrder)
 *   2. Browser opens Checkout (UPI) with that order id
 *   3. Browser posts back {order_id, payment_id, signature}; the server
 *      checks the HMAC (verifyPaymentSignature) before marking PAID
 *   4. The webhook (verifyWebhookSignature) catches payments where the
 *      customer closed the page before step 3
 */
import { getConfig } from "@/config";

const API = "https://api.razorpay.com/v1";

function keys() {
  const c = getConfig();
  if (!c.RAZORPAY_KEY_ID || !c.RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay is not configured");
  }
  return { id: c.RAZORPAY_KEY_ID, secret: c.RAZORPAY_KEY_SECRET };
}

export async function createRazorpayOrder(opts: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<{ id: string; amount: number; currency: string }> {
  const { id, secret } = keys();
  const res = await fetch(`${API}/orders`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: opts.amountPaise,
      currency: "INR",
      receipt: opts.receipt.slice(0, 40),
      notes: opts.notes ?? {},
    }),
  });
  if (!res.ok) {
    console.error("Razorpay order failed", res.status, await res.text().catch(() => ""));
    throw new Error("Could not start the payment. Please try again.");
  }
  return res.json();
}

async function hmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time string compare (signatures are hex, equal length). */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Checkout success handler signature: HMAC(order_id + "|" + payment_id). */
export async function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret = keys().secret
) {
  return safeEqual(await hmacHex(secret, `${orderId}|${paymentId}`), signature);
}

/** Webhook signature: HMAC of the raw request body with the webhook secret. */
export async function verifyWebhookSignature(rawBody: string, signature: string, secret: string) {
  return safeEqual(await hmacHex(secret, rawBody), signature);
}
