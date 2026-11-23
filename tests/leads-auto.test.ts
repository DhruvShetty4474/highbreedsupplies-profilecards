import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import ProfilePage from "@/app/[username]/page";
import type { DB } from "@/db";
import { freshDb, schema } from "./helpers/db";
import { params, signOutBrowser, testIp } from "./helpers/next";
import { login, registerUser, userIdFor } from "./helpers/users";
import { claimCard, createBatch } from "@/lib/cards";

let db: DB;
let ip = 10;
beforeEach(async () => {
  db = await freshDb();
  signOutBrowser();
  testIp.value = `203.0.113.${ip++}`;
});

const leadsFor = async (id: string) =>
  db.select().from(schema.leads).where(eq(schema.leads.cardholder_user_id, id));

describe("signed-in visitor is saved to the owner's contacts", () => {
  it("records once, skips the owner and anonymous visitors", async () => {
    await registerUser({ email: "owner@example.com", username: "owner_one" });
    await registerUser({ email: "visitor@example.com", username: "visitor_one" });
    const ownerId = await userIdFor(db, "owner@example.com");
    const { cards } = await createBatch(db, { quantity: 1, label: "OWN", createdBy: null, baseUrl: "https://highfis.com" });
    await claimCard(db, cards[0].public_token, ownerId);

    signOutBrowser();
    await ProfilePage(params({ username: "owner_one" }) as never);
    expect(await leadsFor(ownerId)).toHaveLength(0);

    await login("owner@example.com");
    await ProfilePage(params({ username: "owner_one" }) as never);
    expect(await leadsFor(ownerId)).toHaveLength(0);

    signOutBrowser();
    await login("visitor@example.com");
    await ProfilePage(params({ username: "owner_one" }) as never);
    await ProfilePage(params({ username: "owner_one" }) as never);
    const rows = await leadsFor(ownerId);
    expect(rows).toHaveLength(1);
    expect(rows[0].visitor_email).toBe("visitor@example.com");
  });
});

describe("no card, no account; no payment, no profile", () => {
  it("normal signup = free trial; a card link must be an unsold card", async () => {
    const { POST: signup } = await import("@/app/api/auth/signup/route");
    const { req } = await import("./helpers/next");
    const body = { email: "nocard@example.com", password: "Strong@123", full_name: "No Card" };
    expect((await signup(req("/api/auth/signup", { body: { ...body, card_token: "tok_fake" } }))).status).toBe(403);
    expect((await signup(req("/api/auth/signup", { body }))).status).toBe(200);
    signOutBrowser();
    expect((await ProfilePage(params({ username: "nocard" }) as never))).toBeTruthy(); // trial: live

    const { cards } = await createBatch(db, { quantity: 1, label: "SOLD", createdBy: null, baseUrl: "https://highfis.com" });
    await registerUser({ email: "buyer@example.com", username: "buyer_one" });
    await claimCard(db, cards[0].public_token, await userIdFor(db, "buyer@example.com"));
    signOutBrowser();
    const r = await signup(req("/api/auth/signup", { body: { ...body, email: "x9@example.com", card_token: cards[0].public_token } }));
    expect(r.status).toBe(403);
  });

  it("card registrant: no public profile until paid; expired trial: hidden", async () => {
    const { cards: c0 } = await createBatch(db, { quantity: 1, label: "RSV", createdBy: null, baseUrl: "https://highfis.com" });
    const { reserveCard } = await import("@/lib/cards");
    await registerUser({ email: "unpaid@example.com", username: "unpaid_one" });
    await reserveCard(db, c0[0].public_token, await userIdFor(db, "unpaid@example.com"), c0[0].activation_code!);
    signOutBrowser();
    await expect(ProfilePage(params({ username: "unpaid_one" }) as never)).rejects.toThrow();
    // Trial over (registered 30 days ago, no card) → hidden.
    await registerUser({ email: "old@example.com", username: "old_trial" });
    await db.update(schema.profiles).set({ created_at: new Date(Date.now() - 30 * 864e5).toISOString() }).where(eq(schema.profiles.email, "old@example.com"));
    signOutBrowser();
    await expect(ProfilePage(params({ username: "old_trial" }) as never)).rejects.toThrow();
    await claimCard(db, c0[0].public_token, await userIdFor(db, "unpaid@example.com"));
    await expect(ProfilePage(params({ username: "unpaid_one" }) as never)).resolves.toBeTruthy();
  });

});
