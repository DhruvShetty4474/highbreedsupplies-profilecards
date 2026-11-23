import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import ProfilePage from "@/app/[username]/page";
import type { DB } from "@/db";
import { freshDb, schema } from "./helpers/db";
import { params, signOutBrowser, testIp } from "./helpers/next";
import { login, registerUser, userIdFor } from "./helpers/users";

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
