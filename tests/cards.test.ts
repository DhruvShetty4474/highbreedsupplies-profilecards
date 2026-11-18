import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { POST as createBatchRoute } from "@/app/api/admin/cards/route";
import { POST as verifyRoute } from "@/app/api/admin/cards/[card_id]/verify/route";
import { POST as statusRoute } from "@/app/api/admin/cards/[card_id]/status/route";
import { GET as exportRoute } from "@/app/api/admin/batches/[batch_id]/export/route";
import { POST as claimRoute } from "@/app/api/cards/claim/route";
import CardTokenRouterPage from "@/app/c/[token]/page";
import type { DB } from "@/db";
import {
  cardsToCsv,
  claimCard,
  createBatch,
  generatePublicToken,
  resolveCardView,
  TOKEN_RE,
} from "@/lib/cards";
import type { Card } from "@/lib/types";
import { freshDb, schema } from "./helpers/db";
import { params, req, signOutBrowser, testIp } from "./helpers/next";
import { registerUser, signedInAdmin, userIdFor } from "./helpers/users";

let db: DB;
let ip = 10;
beforeEach(async () => {
  db = await freshDb();
  signOutBrowser();
  testIp.value = `192.0.2.${ip++}`;
});

const BASE = "https://highfis.com";

async function cardRow(cardId: string) {
  return (await db.select().from(schema.cards).where(eq(schema.cards.card_id, cardId)).get())!;
}

describe("card id + token generation", () => {
  it("tokens are tok_ + 24 base62 chars and unique", () => {
    const tokens = new Set(Array.from({ length: 5000 }, generatePublicToken));
    expect(tokens.size).toBe(5000);
    for (const t of tokens) expect(t).toMatch(TOKEN_RE);
  });

  it("card_ids come from a persistent counter and never collide across batches", async () => {
    const a = await createBatch(db, { quantity: 3, label: "A", createdBy: null, baseUrl: BASE });
    const b = await createBatch(db, { quantity: 2, label: "B", createdBy: null, baseUrl: BASE });
    expect(a.cards.map((c) => c.card_id)).toEqual(["HB000001", "HB000002", "HB000003"]);
    expect(b.cards.map((c) => c.card_id)).toEqual(["HB000004", "HB000005"]);
    expect(a.cards[0].nfc_url).toBe(`${BASE}/c/${a.cards[0].public_token}`);
  });

  it("concurrent batches get disjoint id ranges", async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        createBatch(db, { quantity: 4, label: `C${i}`, createdBy: null, baseUrl: BASE })
      )
    );
    const ids = results.flatMap((r) => r.cards.map((c) => c.card_id));
    expect(new Set(ids).size).toBe(20);
    const rows = await db.select().from(schema.cards);
    expect(rows).toHaveLength(20);
  });

  it("the database enforces unique card_id and token", async () => {
    const { cards } = await createBatch(db, { quantity: 1, label: "U", createdBy: null, baseUrl: BASE });
    const dupToken = db.insert(schema.cards).values({
      card_id: "HB999999",
      public_token: cards[0].public_token,
      nfc_url: "x",
      qr_url: "x",
    });
    await expect(dupToken).rejects.toThrow();
    const dupId = db.insert(schema.cards).values({
      card_id: cards[0].card_id,
      public_token: generatePublicToken(),
      nfc_url: "x",
      qr_url: "x",
    });
    await expect(dupId).rejects.toThrow();
  });

  it("a failed batch leaves nothing behind (all-or-nothing)", async () => {
    const { cards } = await createBatch(db, { quantity: 1, label: "first", createdBy: null, baseUrl: BASE });
    // Force a collision: next reserved id will be HB000002; pre-insert it.
    await db.insert(schema.cards).values({
      card_id: "HB000002",
      public_token: generatePublicToken(),
      nfc_url: "x",
      qr_url: "x",
    });
    await expect(
      createBatch(db, { quantity: 3, label: "doomed", createdBy: null, baseUrl: BASE })
    ).rejects.toThrow();
    const batches = await db.select().from(schema.cardBatches);
    expect(batches.map((b) => b.label)).toEqual(["first"]);
    expect(await db.select().from(schema.cards)).toHaveLength(2);
    expect(cards).toHaveLength(1);
  });

  it("admin batch route ignores start_sequence and uses the counter", async () => {
    await signedInAdmin();
    const r1 = await createBatchRoute(
      req("/api/admin/cards", { body: { quantity: 2, batch_label: "R1", start_sequence: 1 } })
    );
    const r2 = await createBatchRoute(
      req("/api/admin/cards", { body: { quantity: 2, batch_label: "R2", start_sequence: 1 } })
    );
    const ids = [
      ...(await r1.json()).cards,
      ...(await r2.json()).cards,
    ].map((c: { card_id: string }) => c.card_id);
    expect(new Set(ids).size).toBe(4);
  });
});

describe("resolver /c/[token]", () => {
  const card = (over: Partial<Card>): Card => ({
    card_id: "HB000001",
    public_token: "tok_aaaaaaaaaaaaaaaaaaaaaaaa",
    nfc_url: "",
    qr_url: "",
    status: "UNCLAIMED",
    user_id: null,
    batch_id: null,
    programmed_at: null,
    activated_at: null,
    blocked_at: null,
    programming_status: "UNPROGRAMMED",
    ...over,
  });

  it("maps all four states", () => {
    expect(resolveCardView(null, null)).toEqual({ view: "not_found" });
    expect(resolveCardView(card({}), null).view).toBe("activate");
    expect(resolveCardView(card({ status: "BLOCKED" }), null).view).toBe("blocked");
    expect(
      resolveCardView(card({ status: "ACTIVE", user_id: "u1" }), { username: "ana" })
    ).toEqual({ view: "profile", username: "ana" });
    // ACTIVE but owner gone → treated as unknown
    expect(resolveCardView(card({ status: "ACTIVE", user_id: "u1" }), null).view).toBe("not_found");
  });

  it("page: unknown → 404, ACTIVE → redirect to profile, BLOCKED → disabled page, UNCLAIMED → activation", async () => {
    const render = (token: string) => CardTokenRouterPage({ params: Promise.resolve({ token }) });

    await expect(render("tok_doesnotexistdoesnotexis")).rejects.toThrow("NOT_FOUND");
    await expect(render("garbage")).rejects.toThrow("NOT_FOUND");

    const { cards } = await createBatch(db, { quantity: 3, label: "P", createdBy: null, baseUrl: BASE });
    const [unclaimed, active, blocked] = cards;

    const activation = JSON.stringify(await render(unclaimed.public_token));
    expect(activation).not.toContain("Card disabled");

    const u = await registerUser({ username: "owner_one", card_token: active.public_token });
    expect(u.json.card_claimed).toBe(true);
    signOutBrowser();
    await expect(render(active.public_token)).rejects.toThrow("REDIRECT:/owner_one");

    await db
      .update(schema.cards)
      .set({ status: "BLOCKED" })
      .where(eq(schema.cards.card_id, blocked.card_id));
    expect(JSON.stringify(await render(blocked.public_token))).toContain("Card disabled");
  });
});

describe("programming verification", () => {
  it("verify sets programming_status, logs, and never changes status", async () => {
    await signedInAdmin();
    const { cards } = await createBatch(db, { quantity: 2, label: "V", createdBy: null, baseUrl: BASE });
    const [c1, c2] = cards;

    // Make c2 ACTIVE first: verify must not reset it to UNCLAIMED.
    await registerUser({ username: "holder", card_token: c2.public_token });
    await signedInAdmin().catch(() => undefined);
    signOutBrowser();
    const { login } = await import("./helpers/users");
    await login("boss@example.com");

    const bad = await verifyRoute(
      req(`/api/admin/cards/${c1.card_id}/verify`, { body: { nfc_payload_readback: "https://wrong.example" } }),
      params({ card_id: c1.card_id })
    );
    expect((await bad.json()).programming_status).toBe("FAILED");
    expect((await cardRow(c1.card_id)).status).toBe("UNCLAIMED");
    expect((await cardRow(c1.card_id)).programming_status).toBe("FAILED");

    const good = await verifyRoute(
      req(`/api/admin/cards/${c1.card_id}/verify`, { body: { nfc_payload_readback: c1.nfc_url } }),
      params({ card_id: c1.card_id })
    );
    expect((await good.json()).success).toBe(true);
    expect((await cardRow(c1.card_id)).programming_status).toBe("PROGRAMMED");
    expect((await cardRow(c1.card_id)).status).toBe("UNCLAIMED");

    await verifyRoute(
      req(`/api/admin/cards/${c2.card_id}/verify`, { body: { nfc_payload_readback: c2.nfc_url } }),
      params({ card_id: c2.card_id })
    );
    expect((await cardRow(c2.card_id)).status).toBe("ACTIVE");
    expect((await cardRow(c2.card_id)).programming_status).toBe("PROGRAMMED");

    const logs = await db.select().from(schema.cardProgrammingLogs);
    expect(logs).toHaveLength(3);
    expect(logs.filter((l) => l.success)).toHaveLength(2);
  });
});

describe("claiming", () => {
  it("second claim fails; concurrent claims have exactly one winner", async () => {
    const { cards } = await createBatch(db, { quantity: 2, label: "C", createdBy: null, baseUrl: BASE });
    await registerUser({ email: "c1@example.com", username: "claimer_one" });
    await registerUser({ email: "c2@example.com", username: "claimer_two" });
    const u1 = await userIdFor(db, "c1@example.com");
    const u2 = await userIdFor(db, "c2@example.com");

    expect(await claimCard(db, cards[0].public_token, u1)).toEqual({ ok: true, alreadyOwned: false });
    expect(await claimCard(db, cards[0].public_token, u2)).toEqual({ ok: false, reason: "taken" });
    expect(await claimCard(db, cards[0].public_token, u1)).toEqual({ ok: true, alreadyOwned: true });
    expect((await cardRow(cards[0].card_id)).user_id).toBe(u1);

    const race = await Promise.all([
      claimCard(db, cards[1].public_token, u1),
      claimCard(db, cards[1].public_token, u2),
    ]);
    expect(race.filter((r) => r.ok && !r.alreadyOwned)).toHaveLength(1);
  });

  it("claim route: 409 for someone else's card, 403 when blocked, 404 when unknown", async () => {
    const { cards } = await createBatch(db, { quantity: 2, label: "R", createdBy: null, baseUrl: BASE });
    await registerUser({ username: "first_owner", card_token: cards[0].public_token });
    await registerUser({ username: "second_try" });

    const taken = await claimRoute(req("/api/cards/claim", { body: { public_token: cards[0].public_token } }));
    expect(taken.status).toBe(409);

    await db.update(schema.cards).set({ status: "BLOCKED" }).where(eq(schema.cards.card_id, cards[1].card_id));
    const blocked = await claimRoute(req("/api/cards/claim", { body: { public_token: cards[1].public_token } }));
    expect(blocked.status).toBe(403);

    const unknown = await claimRoute(req("/api/cards/claim", { body: { public_token: "tok_nopenopenopenopenopenope" } }));
    expect(unknown.status).toBe(404);
  });

  it("signup cannot claim a card that is already active", async () => {
    const { cards } = await createBatch(db, { quantity: 1, label: "S", createdBy: null, baseUrl: BASE });
    const a = await registerUser({ username: "early_bird", card_token: cards[0].public_token });
    const b = await registerUser({ username: "late_bird", card_token: cards[0].public_token });
    expect(a.json.card_claimed).toBe(true);
    expect(b.json.card_claimed).toBe(false);
    expect((await cardRow(cards[0].card_id)).user_id).toBe(await userIdFor(db, a.email));
  });
});

describe("block / unblock + CSV", () => {
  it("block → BLOCKED; unblock → ACTIVE if owned else UNCLAIMED", async () => {
    const { cards } = await createBatch(db, { quantity: 2, label: "B", createdBy: null, baseUrl: BASE });
    await registerUser({ username: "has_card", card_token: cards[0].public_token });
    signOutBrowser();
    await signedInAdmin();

    for (const c of cards) {
      const r = await statusRoute(req(`/x`, { body: { action: "block" } }), params({ card_id: c.card_id }));
      expect((await r.json()).status).toBe("BLOCKED");
    }
    const r0 = await statusRoute(req(`/x`, { body: { action: "unblock" } }), params({ card_id: cards[0].card_id }));
    expect((await r0.json()).status).toBe("ACTIVE");
    const r1 = await statusRoute(req(`/x`, { body: { action: "unblock" } }), params({ card_id: cards[1].card_id }));
    expect((await r1.json()).status).toBe("UNCLAIMED");
  });

  it("CSV export has the required columns and escapes cells", async () => {
    const { batchId, cards } = await createBatch(db, { quantity: 2, label: "CSV", createdBy: null, baseUrl: BASE });
    await signedInAdmin();
    const res = await exportRoute(req(`/x`), params({ batch_id: batchId }));
    expect(res.headers.get("content-type")).toContain("text/csv");
    const lines = (await res.text()).trim().split("\r\n");
    expect(lines[0]).toBe("card_id,token,nfc_url,qr_url,status,programming_status");
    expect(lines[1]).toBe(
      `${cards[0].card_id},${cards[0].public_token},${cards[0].nfc_url},${cards[0].qr_url},UNCLAIMED,UNPROGRAMMED`
    );
    expect(cardsToCsv([{ ...(await cardRow(cards[0].card_id)), nfc_url: 'a,"b"' }])).toContain('"a,""b"""');
  });
});
