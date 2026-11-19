import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { DELETE as removeAdmin } from "@/app/api/admin/admins/[userId]/route";
import { GET as listAdmins, POST as addAdmin } from "@/app/api/admin/admins/route";
import { GET as listCustomers } from "@/app/api/admin/customers/route";
import { POST as roleRoute } from "@/app/api/admin/customers/[userId]/role/route";
import { GET as vcardRoute } from "@/app/api/cards/[id]/vcard/route";
import AdminsPage from "@/app/admin/admins/page";
import type { DB } from "@/db";
import { fetchAdminMetrics, fetchProfileByUsername } from "@/lib/data";
import { freshDb, schema } from "./helpers/db";
import { params, req, signOutBrowser, testIp } from "./helpers/next";
import { login, registerUser, roleFor, signedInAdmin, userIdFor } from "./helpers/users";

let db: DB;
let ip = 10;
beforeEach(async () => {
  db = await freshDb();
  signOutBrowser();
  testIp.value = `198.19.0.${ip++}`;
});

const json = (r: Response) => r.json();

describe("super admin", () => {
  it("only the super admin creates, lists and removes admins", async () => {
    await signedInAdmin(); // boss@example.com = super admin
    const created = await addAdmin(
      req("/x", { body: { full_name: "Office Admin", email: "office@example.com", password: "Password123" } })
    );
    expect(created.status).toBe(200);
    expect(await roleFor(db, "office@example.com")).toBe("admin");

    // The new admin can sign in straight away (pre-verified)…
    expect((await login("office@example.com")).res.status).toBe(200);
    // …but can't touch admins, or even see the page.
    expect((await listAdmins()).status).toBe(403);
    expect(
      (await addAdmin(req("/x", { body: { full_name: "X", email: "x@example.com", password: "Password123" } }))).status
    ).toBe(403);
    await expect(AdminsPage()).rejects.toThrow("REDIRECT:/admin");

    // Admin can't promote anyone to admin through the manager toggle either.
    const cust = await registerUser({ email: "c@example.com", username: "cust" });
    const custId = await userIdFor(db, cust.email);
    await login("office@example.com");
    expect((await roleRoute(req("/x", { body: { role: "admin" } }), params({ userId: custId }))).status).toBe(400);
    // …nor demote the super admin.
    const bossId = await userIdFor(db, "boss@example.com");
    expect((await roleRoute(req("/x", { body: { role: "client" } }), params({ userId: bossId }))).status).toBe(404);

    await login("boss@example.com");
    const officeId = await userIdFor(db, "office@example.com");
    const list = await json(await listAdmins());
    expect(list.admins.map((a: { email: string }) => a.email)).toEqual(["office@example.com"]);
    expect((await removeAdmin(req("/x", { method: "DELETE" }), params({ userId: officeId }))).status).toBe(200);
    expect(await roleFor(db, "office@example.com")).toBe("client");
    // The super admin can't be removed this way.
    expect((await removeAdmin(req("/x", { method: "DELETE" }), params({ userId: bossId }))).status).toBe(404);
  });

  it("promotes an existing account without a password", async () => {
    await registerUser({ email: "later@example.com", username: "later" });
    await signedInAdmin();
    const res = await json(await addAdmin(req("/x", { body: { full_name: "Later", email: "later@example.com" } })));
    expect(res.promoted).toBe(true);
    expect(await roleFor(db, "later@example.com")).toBe("admin");
  });

  it("is hidden from every list, count and public page", async () => {
    await registerUser({ email: "c1@example.com", username: "client_one" });
    await signedInAdmin();
    const boss = (await db.select().from(schema.profiles).where(eq(schema.profiles.user_id, await userIdFor(db, "boss@example.com"))).get())!;

    const customers = await json(await listCustomers());
    expect(JSON.stringify(customers)).not.toContain("boss@example.com");
    expect(customers.customers).toHaveLength(1);
    expect((await fetchAdminMetrics()).total_profiles).toBe(1);
    expect(await fetchProfileByUsername(boss.username)).toBeNull();
    signOutBrowser();
    const vcard = await vcardRoute(req("/x"), params({ id: boss.user_id }));
    expect(vcard.status).toBe(404);
  });
});
