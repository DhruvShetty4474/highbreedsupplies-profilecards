import { eq } from "drizzle-orm";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as authPost } from "@/app/api/auth/[...all]/route";
import { POST as codeRoute } from "@/app/api/activate/[token]/code/route";
import { POST as checkoutRoute } from "@/app/api/activate/[token]/checkout/route";
import { POST as createBatchRoute } from "@/app/api/admin/cards/route";
import { POST as roleRoute } from "@/app/api/admin/customers/[userId]/role/route";
import { POST as settingsRoute } from "@/app/api/admin/settings/route";
import { POST as cashCodeRoute } from "@/app/api/manager/orders/[id]/cash-code/route";
import { POST as cashRoute } from "@/app/api/orders/[id]/cash/route";
import { POST as rzpVerifyRoute } from "@/app/api/orders/[id]/razorpay-verify/route";
import { POST as webhookRoute } from "@/app/api/webhooks/razorpay/route";
import InvoicePage from "@/app/invoice/[id]/page";
import type { DB } from "@/db";
import { getSessionProfile } from "@/lib/auth";
import { financialYear, priceBreakup } from "@/lib/orders";
import { freshDb, schema } from "./helpers/db";
import { absorbSetCookies, params, req, signOutBrowser, testIp } from "./helpers/next";
import { login, registerUser, signedInAdmin, userIdFor } from "./helpers/users";

let db: DB;
let ip = 10;
beforeEach(async () => {
  db = await freshDb();
  signOutBrowser();
  testIp.value = `198.18.0.${ip++}`;
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  for (const k of ["REQUIRE_EMAIL_VERIFICATION", "RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"]) {
    delete process.env[k];
  }
  process.env.REQUIRE_EMAIL_VERIFICATION = "false";
});

/** Run `fn` and return every OTP printed by the console email fallback. */
async function capturingOtps<T>(fn: () => Promise<T>) {
  const logs: string[] = [];
  const spy = vi.spyOn(console, "info").mockImplementation((m: unknown) => {
    logs.push(String(m));
  });
  const result = await fn();
  spy.mockRestore();
  const otps = logs.flatMap((l) => [...l.matchAll(/Subject: (\d{6}) is your HIGHBREED code/g)].map((m) => m[1]));
  return { result, otps };
}

const json = (r: Response) => r.json();

describe("email OTP", () => {
  it("registration needs the emailed code before the user is signed in", async () => {
    process.env.REQUIRE_EMAIL_VERIFICATION = "true";
    const { result: u, otps } = await capturingOtps(() =>
      registerUser({ email: "otp@example.com", username: "otp_user" })
    );
    expect(u.json.verification_required).toBe(true);
    expect(await getSessionProfile()).toBeNull();
    expect(otps).toHaveLength(1);

    // Password sign-in is refused until verified, and returns the email.
    const { result: early, otps: resent } = await capturingOtps(() => login("otp_user"));
    expect(early.res.status).toBe(403);
    expect(early.json).toMatchObject({ code: "EMAIL_NOT_VERIFIED", email: "otp@example.com" });
    expect(resent).toHaveLength(1);

    const wrong = await authPost(
      req("/api/auth/email-otp/verify-email", { body: { email: "otp@example.com", otp: "000000" } })
    );
    expect(wrong.status).toBe(400);

    const ok = absorbSetCookies(
      await authPost(
        req("/api/auth/email-otp/verify-email", { body: { email: "otp@example.com", otp: resent[0] } })
      )
    );
    expect(ok.status).toBe(200);
    expect((await getSessionProfile())?.username).toBe("otp_user");
    expect((await login("otp@example.com")).res.status).toBe(200);
  });

  it("signs an existing user in with a code, and never creates accounts", async () => {
    await registerUser({ email: "codein@example.com", username: "code_in" });
    signOutBrowser();
    const { otps } = await capturingOtps(() =>
      authPost(req("/api/auth/email-otp/send-verification-otp", { body: { email: "codein@example.com", type: "sign-in" } }))
    );
    expect(otps).toHaveLength(1);
    const res = absorbSetCookies(
      await authPost(req("/api/auth/sign-in/email-otp", { body: { email: "codein@example.com", otp: otps[0] } }))
    );
    expect(res.status).toBe(200);
    expect((await getSessionProfile())?.username).toBe("code_in");

    signOutBrowser();
    const { otps: none } = await capturingOtps(() =>
      authPost(req("/api/auth/email-otp/send-verification-otp", { body: { email: "nobody@example.com", type: "sign-in" } }))
    );
    expect(none).toHaveLength(0);
  });
});

/** Admin + manager + a batch assigned to the manager; leaves nobody signed in. */
async function setup(price = 999) {
  const manager = await registerUser({ email: "mgr@example.com", username: "the_manager" });
  const managerId = await userIdFor(db, manager.email);
  const other = await registerUser({ email: "mgr2@example.com", username: "other_manager" });
  const otherId = await userIdFor(db, other.email);

  await signedInAdmin();
  for (const id of [managerId, otherId]) {
    expect((await roleRoute(req("/x", { body: { role: "manager" } }), params({ userId: id }))).status).toBe(200);
  }
  const settings = await settingsRoute(
    req("/x", {
      body: {
        card_price_inr: price,
        gst_rate_percent: 18,
        seller_name: "HIGHBREED SUPPLIES",
        seller_gstin: "27ABCDE1234F1Z5",
        seller_address: "Mumbai",
        seller_phone: "",
        seller_email: "",
        hsn_code: "852352",
        terms_text: "Cards are non-refundable once activated.",
      },
    })
  );
  expect(settings.status).toBe(200);
  const batch = await json(
    await createBatchRoute(req("/x", { body: { quantity: 2, batch_label: "Mumbai run", manager_id: managerId } }))
  );
  signOutBrowser();
  expect(batch).toHaveProperty("cards");
  return { managerId, cards: batch.cards as { card_id: string; activation_code: string; public_token: string }[] };
}

const billing = {
  name: "Asha Rao",
  phone: "+91 98765 43210",
  email: "asha@example.com",
  gstin: "",
  address: "12 MG Road, Bengaluru 560001",
  terms: true,
};

async function cardRow(cardId: string) {
  return (await db.select().from(schema.cards).where(eq(schema.cards.card_id, cardId)).get())!;
}

describe("card activation: code → pay by cash with the manager's code", () => {
  it("runs the whole flow and issues an invoice", async () => {
    const { managerId, cards } = await setup();
    const card = cards[0];

    const customer = await registerUser({ email: "asha@example.com", username: "asha" });
    const customerId = await userIdFor(db, customer.email);
    const tokenParams = params({ token: card.public_token });

    // Can't pay before proving the card is in hand.
    const early = await checkoutRoute(req("/x", { body: { ...billing, method: "CASH" } }), tokenParams);
    expect(early.status).toBe(409);

    expect((await codeRoute(req("/x", { body: { code: "HB999999" } }), tokenParams)).status).toBe(400);
    // The card number printed on the card itself is not the activation code.
    expect((await codeRoute(req("/x", { body: { code: card.card_id } }), tokenParams)).status).toBe(400);
    const ok = await codeRoute(req("/x", { body: { code: ` ${card.activation_code.toLowerCase().replace(/(...)/, "$1-")} ` } }), tokenParams);
    expect(ok.status).toBe(200);
    expect((await cardRow(card.card_id)).status).toBe("RESERVED");
    const prof = await db.select().from(schema.profiles).where(eq(schema.profiles.user_id, customerId)).get();
    expect(prof!.referred_by).toBe(managerId);

    // Form validation.
    const bad = await checkoutRoute(req("/x", { body: { ...billing, phone: "12345", method: "CASH" } }), tokenParams);
    expect(bad.status).toBe(400);
    const noTerms = await checkoutRoute(req("/x", { body: { ...billing, terms: false, method: "CASH" } }), tokenParams);
    expect(noTerms.status).toBe(400);
    // UPI is unavailable without Razorpay keys.
    expect((await checkoutRoute(req("/x", { body: { ...billing, method: "UPI" } }), tokenParams)).status).toBe(503);

    const co = await json(await checkoutRoute(req("/x", { body: { ...billing, method: "CASH" } }), tokenParams));
    expect(co.method).toBe("CASH");
    const orderId: string = co.order_id;
    const order = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId)).get();
    expect(order).toMatchObject({ amount_paise: 99900, gst_rate_bp: 1800, customer_phone: "9876543210", manager_id: managerId });

    // No code yet.
    expect((await cashRoute(req("/x", { body: { code: "123456" } }), params({ id: orderId }))).status).toBe(409);
    // The customer can't issue a code; another manager can't either.
    expect((await cashCodeRoute(req("/x"), params({ id: orderId }))).status).toBe(403);
    await login("mgr2@example.com");
    expect((await cashCodeRoute(req("/x"), params({ id: orderId }))).status).toBe(403);

    await login("mgr@example.com");
    const issued = await json(await cashCodeRoute(req("/x"), params({ id: orderId })));
    expect(issued.code).toMatch(/^\d{6}$/);

    await login("asha@example.com");
    const wrongCode = issued.code === "000000" ? "111111" : "000000";
    expect((await cashRoute(req("/x", { body: { code: wrongCode } }), params({ id: orderId }))).status).toBe(400);
    expect((await cashRoute(req("/x", { body: { code: issued.code } }), params({ id: orderId }))).status).toBe(200);
    // Single use.
    expect((await cashRoute(req("/x", { body: { code: issued.code } }), params({ id: orderId }))).status).toBe(409);

    const paid = (await db.select().from(schema.orders).where(eq(schema.orders.id, orderId)).get())!;
    expect(paid).toMatchObject({ status: "PAID", method: "CASH", cash_approved_by: managerId, cash_code_hash: null });
    expect(paid.invoice_no).toBe(`HB/${financialYear()}/0001`);
    expect(await cardRow(card.card_id)).toMatchObject({ status: "ACTIVE", user_id: customerId });

    // Invoice: customer and their manager can see it; another customer can't.
    const invoice = async () => renderToStaticMarkup(await InvoicePage({ params: Promise.resolve({ id: orderId }) }));
    const html = await invoice();
    expect(html).toContain(paid.invoice_no);
    expect(html).toContain("CGST");
    await login("mgr@example.com");
    expect(await invoice()).toContain("Asha Rao");
    await registerUser({ email: "nosy@example.com", username: "nosy" });
    await expect(InvoicePage({ params: Promise.resolve({ id: orderId }) })).rejects.toThrow("NOT_FOUND");
  });

  it("locks the cash code after 5 wrong tries", async () => {
    const { cards } = await setup();
    const card = cards[0];
    await registerUser({ email: "asha@example.com", username: "asha" });
    const p = params({ token: card.public_token });
    await codeRoute(req("/x", { body: { code: card.activation_code } }), p);
    const { order_id } = await json(await checkoutRoute(req("/x", { body: { ...billing, method: "CASH" } }), p));
    await login("mgr@example.com");
    const { code } = await json(await cashCodeRoute(req("/x"), params({ id: order_id })));
    await login("asha@example.com");
    const wrong = code === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++) await cashRoute(req("/x", { body: { code: wrong } }), params({ id: order_id }));
    expect((await cashRoute(req("/x", { body: { code } }), params({ id: order_id }))).status).toBe(429);
  });

  it("another user can't reserve a card someone else holds", async () => {
    const { cards } = await setup();
    const p = params({ token: cards[0].public_token });
    await registerUser({ email: "first@example.com", username: "first" });
    expect((await codeRoute(req("/x", { body: { code: cards[0].activation_code } }), p)).status).toBe(200);
    await registerUser({ email: "second@example.com", username: "second" });
    expect((await codeRoute(req("/x", { body: { code: cards[0].activation_code } }), p)).status).toBe(409);
  });

  it("refuses checkout while the price is not set", async () => {
    const { cards } = await setup(0);
    const p = params({ token: cards[0].public_token });
    await registerUser({ email: "asha@example.com", username: "asha" });
    await codeRoute(req("/x", { body: { code: cards[0].activation_code } }), p);
    expect((await checkoutRoute(req("/x", { body: { ...billing, method: "CASH" } }), p)).status).toBe(503);
  });
});

async function hmac(secret: string, msg: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

describe("UPI via Razorpay", () => {
  it("creates a Razorpay order, verifies the signature, and the webhook is idempotent", async () => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_key";
    process.env.RAZORPAY_KEY_SECRET = "rzp_test_secret";
    process.env.RAZORPAY_WEBHOOK_SECRET = "whsec_test";
    const realFetch = globalThis.fetch;
    const calls: { url: string; body: unknown; auth: string | null }[] = [];
    vi.stubGlobal("fetch", async (url: string | URL, init?: RequestInit) => {
      if (String(url).startsWith("https://api.razorpay.com/")) {
        calls.push({
          url: String(url),
          body: JSON.parse(String(init?.body)),
          auth: new Headers(init?.headers).get("authorization"),
        });
        return new Response(JSON.stringify({ id: "order_RZP123", amount: 99900, currency: "INR" }));
      }
      return realFetch(url, init);
    });

    const { cards } = await setup();
    const card = cards[0];
    await registerUser({ email: "asha@example.com", username: "asha" });
    const p = params({ token: card.public_token });
    await codeRoute(req("/x", { body: { code: card.activation_code } }), p);
    const co = await json(await checkoutRoute(req("/x", { body: { ...billing, method: "UPI" } }), p));
    expect(co.razorpay).toMatchObject({ key: "rzp_test_key", order_id: "order_RZP123", amount: 99900 });
    expect(calls[0]).toMatchObject({ url: "https://api.razorpay.com/v1/orders", body: { amount: 99900, currency: "INR" } });
    expect(calls[0].auth).toBe(`Basic ${btoa("rzp_test_key:rzp_test_secret")}`);

    // Retrying reuses the same Razorpay order.
    await checkoutRoute(req("/x", { body: { ...billing, method: "UPI" } }), p);
    expect(calls).toHaveLength(1);

    const id = { id: co.order_id };
    const forged = await rzpVerifyRoute(
      req("/x", { body: { razorpay_order_id: "order_RZP123", razorpay_payment_id: "pay_1", razorpay_signature: "deadbeef" } }),
      params(id)
    );
    expect(forged.status).toBe(400);
    expect((await cardRow(card.card_id)).status).toBe("RESERVED");

    const sig = await hmac("rzp_test_secret", "order_RZP123|pay_1");
    const good = await rzpVerifyRoute(
      req("/x", { body: { razorpay_order_id: "order_RZP123", razorpay_payment_id: "pay_1", razorpay_signature: sig } }),
      params(id)
    );
    expect(good.status).toBe(200);
    expect((await cardRow(card.card_id)).status).toBe("ACTIVE");

    // Late webhook for the same payment: accepted, nothing changes.
    const body = JSON.stringify({
      event: "payment.captured",
      payload: { payment: { entity: { id: "pay_1", order_id: "order_RZP123", amount: 99900, status: "captured" } } },
    });
    const bad = await webhookRoute(
      new Request("http://localhost/api/webhooks/razorpay", { method: "POST", body, headers: { "x-razorpay-signature": "nope" } })
    );
    expect(bad.status).toBe(400);
    const hook = await webhookRoute(
      new Request("http://localhost/api/webhooks/razorpay", {
        method: "POST",
        body,
        headers: { "x-razorpay-signature": await hmac("whsec_test", body) },
      })
    );
    expect(hook.status).toBe(200);
    const orders = await db.select().from(schema.orders);
    expect(orders).toHaveLength(1);
    expect(orders[0]).toMatchObject({ status: "PAID", method: "UPI", razorpay_payment_id: "pay_1" });
    expect(orders[0].invoice_no).toMatch(/0001$/);
  });

  it("the webhook alone completes a payment when the browser never reports back", async () => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_key";
    process.env.RAZORPAY_KEY_SECRET = "rzp_test_secret";
    process.env.RAZORPAY_WEBHOOK_SECRET = "whsec_test";
    const realFetch = globalThis.fetch;
    vi.stubGlobal("fetch", async (url: string | URL, init?: RequestInit) =>
      String(url).startsWith("https://api.razorpay.com/")
        ? new Response(JSON.stringify({ id: "order_RZP9", amount: 99900, currency: "INR" }))
        : realFetch(url, init)
    );
    const { cards } = await setup();
    await registerUser({ email: "asha@example.com", username: "asha" });
    const p = params({ token: cards[0].public_token });
    await codeRoute(req("/x", { body: { code: cards[0].activation_code } }), p);
    await checkoutRoute(req("/x", { body: { ...billing, method: "UPI" } }), p);

    const send = async (amount: number) => {
      const body = JSON.stringify({
        event: "payment.captured",
        payload: { payment: { entity: { id: "pay_9", order_id: "order_RZP9", amount, status: "captured" } } },
      });
      return webhookRoute(
        new Request("http://localhost/api/webhooks/razorpay", {
          method: "POST",
          body,
          headers: { "x-razorpay-signature": await hmac("whsec_test", body) },
        })
      );
    };
    await send(100); // wrong amount → ignored
    expect((await cardRow(cards[0].card_id)).status).toBe("RESERVED");
    await send(99900);
    expect((await cardRow(cards[0].card_id)).status).toBe("ACTIVE");
  });
});

describe("money", () => {
  it("splits a GST-inclusive price", () => {
    expect(priceBreakup(99900, 1800)).toEqual({ taxable: 84661, tax: 15239, total: 99900 });
    expect(priceBreakup(118000, 1800)).toEqual({ taxable: 100000, tax: 18000, total: 118000 });
  });

  it("uses the Indian financial year", () => {
    expect(financialYear(new Date("2026-03-31T18:31:00Z"))).toBe("2026-27"); // 00:01 on 1 Apr IST
    expect(financialYear(new Date("2026-03-31T10:00:00Z"))).toBe("2025-26");
  });
});

describe("roles", () => {
  it("only admins change roles, and never to admin", async () => {
    const u = await registerUser({ email: "x@example.com", username: "plain" });
    const id = await userIdFor(db, u.email);
    expect((await roleRoute(req("/x", { body: { role: "manager" } }), params({ userId: id }))).status).toBe(403);
    await signedInAdmin();
    expect((await roleRoute(req("/x", { body: { role: "admin" } }), params({ userId: id }))).status).toBe(400);
  });
});

describe("activation codes + reservation expiry", () => {
  it("new cards get random, readable 6-character codes", async () => {
    const { createBatch } = await import("@/lib/cards");
    const { cards } = await createBatch(db, { quantity: 50, label: "Codes", createdBy: null, baseUrl: "https://highfis.com" });
    const codes = cards.map((c) => c.activation_code);
    for (const c of codes) expect(c).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
    expect(new Set(codes).size).toBe(50);
  });

  it("an unpaid reservation expires after 7 days: card freed, open order cancelled", async () => {
    const { cards } = await setup();
    const card = cards[0];
    const p = params({ token: card.public_token });
    await registerUser({ email: "slow@example.com", username: "slow" });
    await codeRoute(req("/x", { body: { code: card.activation_code } }), p);
    const { order_id } = await json(await checkoutRoute(req("/x", { body: { ...billing, method: "CASH" } }), p));

    // Not expired yet: someone else can't take it.
    await registerUser({ email: "next@example.com", username: "next_buyer" });
    expect((await codeRoute(req("/x", { body: { code: card.activation_code } }), p)).status).toBe(409);

    const eightDaysAgo = new Date(Date.now() - 8 * 86_400_000).toISOString();
    await db.update(schema.cards).set({ reserved_at: eightDaysAgo }).where(eq(schema.cards.card_id, card.card_id));

    expect((await codeRoute(req("/x", { body: { code: card.activation_code } }), p)).status).toBe(200);
    expect((await cardRow(card.card_id)).user_id).toBe(await userIdFor(db, "next@example.com"));
    const old = (await db.select().from(schema.orders).where(eq(schema.orders.id, order_id)).get())!;
    expect(old.status).toBe("CANCELLED");

    // The first customer's cash code can no longer be used.
    await login("mgr@example.com");
    expect((await cashCodeRoute(req("/x"), params({ id: order_id }))).status).toBe(409);
  });

  it("a UPI payment that lands after expiry is still recorded and activates the free card", async () => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_key";
    process.env.RAZORPAY_KEY_SECRET = "rzp_test_secret";
    process.env.RAZORPAY_WEBHOOK_SECRET = "whsec_test";
    const realFetch = globalThis.fetch;
    vi.stubGlobal("fetch", async (url: string | URL, init?: RequestInit) =>
      String(url).startsWith("https://api.razorpay.com/")
        ? new Response(JSON.stringify({ id: "order_LATE", amount: 99900, currency: "INR" }))
        : realFetch(url, init)
    );
    const { cards } = await setup();
    const card = cards[0];
    const p = params({ token: card.public_token });
    await registerUser({ email: "late@example.com", username: "late_payer" });
    await codeRoute(req("/x", { body: { code: card.activation_code } }), p);
    await checkoutRoute(req("/x", { body: { ...billing, method: "UPI" } }), p);

    const { releaseExpiredReservations } = await import("@/lib/cards");
    await db.update(schema.cards).set({ reserved_at: new Date(Date.now() - 8 * 86_400_000).toISOString() });
    expect(await releaseExpiredReservations(db)).toBe(1);
    expect((await cardRow(card.card_id)).status).toBe("UNCLAIMED");

    const body = JSON.stringify({
      event: "payment.captured",
      payload: { payment: { entity: { id: "pay_LATE", order_id: "order_LATE", amount: 99900, status: "captured" } } },
    });
    await webhookRoute(
      new Request("http://localhost/api/webhooks/razorpay", {
        method: "POST",
        body,
        headers: { "x-razorpay-signature": await hmac("whsec_test", body) },
      })
    );
    const order = (await db.select().from(schema.orders).get())!;
    expect(order.status).toBe("PAID");
    expect(await cardRow(card.card_id)).toMatchObject({
      status: "ACTIVE",
      user_id: await userIdFor(db, "late@example.com"),
    });
  });

  it("admin can release a reserved card by hand", async () => {
    const { POST: statusRoute } = await import("@/app/api/admin/cards/[card_id]/status/route");
    const { cards } = await setup();
    await registerUser({ email: "holder@example.com", username: "holder" });
    await codeRoute(req("/x", { body: { code: cards[0].activation_code } }), params({ token: cards[0].public_token }));
    await login("boss@example.com");
    const res = await json(await statusRoute(req("/x", { body: { action: "release" } }), params({ card_id: cards[0].card_id })));
    expect(res).toMatchObject({ changed: true, status: "UNCLAIMED" });
  });
});
