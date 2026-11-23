import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { POST as activateRoute } from "@/app/api/admin/cards/[card_id]/activate/route";
import { POST as settingsRoute } from "@/app/api/admin/settings/route";
import type { DB } from "@/db";
import { createBatch, reserveCard } from "@/lib/cards";
import { freshDb, schema } from "./helpers/db";
import { params, req, signOutBrowser, testIp } from "./helpers/next";
import { login, registerUser, signedInAdmin, userIdFor } from "./helpers/users";

let db: DB;
let ip = 10;
beforeEach(async () => {
  db = await freshDb();
  signOutBrowser();
  testIp.value = `198.51.100.${200 + ip++}`;
});

describe("admin activates a card directly", () => {
  it("awaiting-payment card → ACTIVE with a paid invoice; customers/managers can't", async () => {
    const { cards } = await createBatch(db, { quantity: 1, label: "ACT", createdBy: null, baseUrl: "https://highfis.com" });
    const c = cards[0];
    await registerUser({ email: "cust@example.com", username: "cust_one" });
    const uid = await userIdFor(db, "cust@example.com");
    await reserveCard(db, c.public_token, uid, c.activation_code!);

    const call = () => activateRoute(req(`/api/admin/cards/${c.card_id}/activate`, { body: {} }), params({ card_id: c.card_id }));
    await login("cust@example.com");
    expect((await call()).status).toBe(403);

    await signedInAdmin();
    await login("boss@example.com");
    await settingsRoute(req("/api/admin/settings", { body: {
      card_price_inr: 999, gst_rate_percent: 18, free_trial_days: 7, seller_name: "HIGHBREED SUPPLIES",
      seller_gstin: "", seller_address: "", seller_phone: "", seller_email: "", hsn_code: "852352", terms_text: "Test terms for the card.",
    } }));
    const r = await call();
    expect(r.status).toBe(200);
    const card = await db.select().from(schema.cards).where(eq(schema.cards.card_id, c.card_id)).get();
    expect(card?.status).toBe("ACTIVE");
    const order = await db.select().from(schema.orders).where(eq(schema.orders.card_id, c.card_id)).get();
    expect(order?.status).toBe("PAID");
    expect(order?.invoice_no).toMatch(/^HB\//);
    expect(order?.customer_email).toBe("cust@example.com");

    expect((await call()).status).toBe(409); // already active
  });
});
