import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { DELETE as deleteRoute } from "@/app/api/admin/customers/[userId]/route";
import type { DB } from "@/db";
import { claimCard, createBatch, reserveCard } from "@/lib/cards";
import { freshDb, schema } from "./helpers/db";
import { params, req, signOutBrowser, testIp } from "./helpers/next";
import { login, registerUser, signedInAdmin, userIdFor } from "./helpers/users";

let db: DB;
let ip = 10;
beforeEach(async () => {
  db = await freshDb();
  signOutBrowser();
  testIp.value = `192.0.2.${100 + ip++}`;
});

const del = (userId: string, confirm: string) =>
  deleteRoute(
    req(`/api/admin/customers/${userId}`, { method: "DELETE", body: { confirm_username: confirm } }),
    params({ userId })
  );

describe("admin deletes a user", () => {
  it("soft-deletes: locks the account, blocks/releases cards, keeps data", async () => {
    const { cards } = await createBatch(db, { quantity: 2, label: "DEL", createdBy: null, baseUrl: "https://highfis.com" });
    await registerUser({ email: "gone@example.com", username: "gone_user" });
    const uid = await userIdFor(db, "gone@example.com");
    await claimCard(db, cards[0].public_token, uid);
    await reserveCard(db, cards[1].public_token, uid, cards[1].activation_code!);
    await db.insert(schema.orders).values({
      id: "ord_paid", user_id: uid, card_id: cards[0].card_id, status: "PAID", method: "CASH",
      amount_paise: 100000, gst_rate_bp: 1800, invoice_no: "HB/2026-27/0001",
    });
    await db.insert(schema.leads).values({ id: "l1", cardholder_user_id: uid, visitor_name: "V" });

    // Non-admin can't delete.
    await registerUser({ email: "other@example.com", username: "other_user" });
    await login("other@example.com");
    expect((await del(uid, "gone_user")).status).toBe(403);

    await signedInAdmin();
    await login("boss@example.com");
    expect((await del(uid, "wrong_name")).status).toBe(400);
    expect((await del(uid, "gone_user")).status).toBe(200);

    // Soft delete: rows kept, profile marked deleted, sign-in refused.
    expect(await db.select().from(schema.user).where(eq(schema.user.id, uid)).get()).toBeTruthy();
    const prof = await db.select().from(schema.profiles).where(eq(schema.profiles.user_id, uid)).get();
    expect(prof?.deleted_at).toBeTruthy();
    expect(await db.select().from(schema.leads)).toHaveLength(1);
    const order = await db.select().from(schema.orders).where(eq(schema.orders.id, "ord_paid")).get();
    expect(order?.invoice_no).toBe("HB/2026-27/0001");
    expect((await login("gone@example.com")).res.status).not.toBe(200);
    await login("boss@example.com");
    expect((await del(uid, "gone_user")).status).toBe(404); // already deleted
    const c0 = await db.select().from(schema.cards).where(eq(schema.cards.card_id, cards[0].card_id)).get();
    const c1 = await db.select().from(schema.cards).where(eq(schema.cards.card_id, cards[1].card_id)).get();
    expect(c0?.status).toBe("BLOCKED");
    expect(c1?.status).toBe("UNCLAIMED");
    expect(c1?.user_id).toBeNull();
  });

  it("can never delete an admin or the super admin", async () => {
    await signedInAdmin();
    const bossId = await userIdFor(db, "boss@example.com");
    const a = await registerUser({ email: "adm@example.com", username: "adm_user" });
    await db.update(schema.profiles).set({ role: "admin" }).where(eq(schema.profiles.email, a.email));
    const admId = await userIdFor(db, "adm@example.com");
    await login("adm@example.com");
    expect((await del(bossId, "the_boss")).status).toBe(404);
    await login("boss@example.com");
    expect((await del(admId, "adm_user")).status).toBe(404);
  });
});
