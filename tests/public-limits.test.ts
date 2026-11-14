import { beforeEach, describe, expect, it } from "vitest";
import { POST as analyticsRoute } from "@/app/api/analytics/route";
import { POST as leadsRoute } from "@/app/api/leads/route";
import type { DB } from "@/db";
import { fetchStats } from "@/lib/data";
import { freshDb, schema } from "./helpers/db";
import { req, signOutBrowser, testIp } from "./helpers/next";
import { registerUser, userIdFor } from "./helpers/users";

let db: DB;
let ownerId: string;
let ip = 10;
beforeEach(async () => {
  db = await freshDb();
  testIp.value = `198.18.0.${ip++}`;
  await registerUser({ email: "owner@example.com", username: "lead_owner" });
  ownerId = await userIdFor(db, "owner@example.com");
  signOutBrowser();
  testIp.value = `198.18.1.${ip++}`; // visitor
});

describe("public endpoints are rate-limited", () => {
  it("lead form: 5 per hour per visitor, then 429", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) {
      const res = await leadsRoute(
        req("/api/leads", { body: { cardholder_user_id: ownerId, visitor_name: `V${i}` } })
      );
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
    expect(statuses.slice(5)).toEqual([429, 429]);
    expect(await db.select().from(schema.leads)).toHaveLength(5);
  });

  it("analytics: repeated hits from one visitor are not counted beyond the cap", async () => {
    for (let i = 0; i < 10; i++) {
      const res = await analyticsRoute(
        req("/api/analytics", { body: { user_id: ownerId, event: "reach" } })
      );
      expect(res.status).toBe(200);
    }
    expect((await fetchStats(ownerId)).reaches).toBe(3);

    testIp.value = "198.18.9.9"; // a different visitor still counts
    await analyticsRoute(req("/api/analytics", { body: { user_id: ownerId, event: "reach" } }));
    expect((await fetchStats(ownerId)).reaches).toBe(4);
  });
});
