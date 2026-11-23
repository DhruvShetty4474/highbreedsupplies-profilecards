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
  it("signup needs an unsold card", async () => {
    const { POST: signup } = await import("@/app/api/auth/signup/route");
    const { req } = await import("./helpers/next");
    const body = { email: "nocard@example.com", password: "Strong@123", full_name: "No Card" };
    expect((await signup(req("/api/auth/signup", { body }))).status).toBe(403);
    expect((await signup(req("/api/auth/signup", { body: { ...body, card_token: "tok_fake" } }))).status).toBe(403);

    const { cards } = await createBatch(db, { quantity: 1, label: "SOLD", createdBy: null, baseUrl: "https://highfis.com" });
    await registerUser({ email: "buyer@example.com", username: "buyer_one" });
    await claimCard(db, cards[0].public_token, await userIdFor(db, "buyer@example.com"));
    signOutBrowser();
    const r = await signup(req("/api/auth/signup", { body: { ...body, card_token: cards[0].public_token } }));
    expect(r.status).toBe(403);
  });

  it("an unpaid customer has no public profile until the card is paid", async () => {
    await registerUser({ email: "unpaid@example.com", username: "unpaid_one" });
    signOutBrowser();
    await expect(ProfilePage(params({ username: "unpaid_one" }) as never)).rejects.toThrow();
    const { cards } = await createBatch(db, { quantity: 1, label: "PAY", createdBy: null, baseUrl: "https://highfis.com" });
    await claimCard(db, cards[0].public_token, await userIdFor(db, "unpaid@example.com"));
    await expect(ProfilePage(params({ username: "unpaid_one" }) as never)).resolves.toBeTruthy();
  });
});
