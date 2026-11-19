import { beforeEach, describe, expect, it } from "vitest";
import { GET as programmingData } from "@/app/api/admin/cards/[card_id]/programming-data/route";
import { POST as verifyRoute } from "@/app/api/admin/cards/[card_id]/verify/route";
import { POST as statusRoute } from "@/app/api/admin/cards/[card_id]/status/route";
import { GET as qrRoute } from "@/app/api/admin/cards/[card_id]/qr/route";
import { POST as createBatchRoute } from "@/app/api/admin/cards/route";
import { GET as listCustomers, POST as createCustomer } from "@/app/api/admin/customers/route";
import { GET as exportRoute } from "@/app/api/admin/batches/[batch_id]/export/route";
import { POST as authPost } from "@/app/api/auth/[...all]/route";
import { PATCH as profilePatch } from "@/app/api/profile/route";
import AdminCardsPage from "@/app/admin/cards/page";
import type { DB } from "@/db";
import { createBatch } from "@/lib/cards";
import { freshDb } from "./helpers/db";
import { absorbSetCookies, params, req, signOutBrowser, testIp } from "./helpers/next";
import { login, registerUser, roleFor, signedInAdmin } from "./helpers/users";

let db: DB;
let ip = 10;
let cardId: string;
let batchId: string;
beforeEach(async () => {
  db = await freshDb();
  signOutBrowser();
  testIp.value = `203.0.113.${ip++}`;
  const b = await createBatch(db, {
    quantity: 1,
    label: "T",
    createdBy: null,
    baseUrl: "https://highfis.com",
  });
  cardId = b.cards[0].card_id;
  batchId = b.batchId;
});

/** Every admin endpoint, called with the current browser's session. */
const adminCalls = () => [
  ["programming-data", () => programmingData(req("/x"), params({ card_id: cardId }))],
  ["verify", () => verifyRoute(req("/x", { body: { nfc_payload_readback: "https://highfis.com/c/x" } }), params({ card_id: cardId }))],
  ["status", () => statusRoute(req("/x", { body: { action: "block" } }), params({ card_id: cardId }))],
  ["qr", () => qrRoute(req("/x"), params({ card_id: cardId }))],
  ["create batch", () => createBatchRoute(req("/x", { body: { quantity: 1, batch_label: "Nope" } }))],
  ["list customers", () => listCustomers()],
  ["create customer", () => createCustomer(req("/x", { body: { login_id: "sneaky", password: "Password123", full_name: "Sneaky" } }))],
  ["export", () => exportRoute(req("/x"), params({ batch_id: batchId }))],
] as const;

describe("admin API authorization", () => {
  it("anonymous → 401 on every /api/admin endpoint", async () => {
    for (const [name, call] of adminCalls()) {
      const res = await call();
      expect(res.status, name).toBe(401);
    }
  });

  it("client → 403 on every /api/admin endpoint (incl. programming-data)", async () => {
    await registerUser({ username: "plain_client" });
    for (const [name, call] of adminCalls()) {
      const res = await call();
      expect(res.status, name).toBe(403);
    }
  });

  it("admin → programming-data works", async () => {
    await signedInAdmin();
    const res = await programmingData(req("/x"), params({ card_id: cardId }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.nfc_url).toMatch(/^https:\/\/highfis.com\/c\/tok_/);
    expect(body.programming_status).toBe("UNPROGRAMMED");
  });

  it("admin pages redirect non-admins themselves (not only via layout)", async () => {
    await expect(AdminCardsPage()).rejects.toThrow("REDIRECT:/login");
    await registerUser({ username: "page_client" });
    await expect(AdminCardsPage()).rejects.toThrow("REDIRECT:/dashboard");
  });
});

describe("role escalation", () => {
  it("signup ignores a client-supplied role", async () => {
    const u = await registerUser({ email: "wannabe@example.com", username: "wannabe" }, { role: "admin" });
    expect(u.res.status).toBe(200);
    expect(await roleFor(db, "wannabe@example.com")).toBe("client");
  });

  it("Better Auth's raw sign-up endpoint can't set a role either", async () => {
    signOutBrowser();
    const res = await authPost(
      req("/api/auth/sign-up/email", {
        body: { email: "raw@example.com", password: "Password123", name: "Raw", role: "admin" },
      })
    );
    expect(res.status).toBeLessThan(500);
    if (res.status === 200) expect(await roleFor(db, "raw@example.com")).toBe("client");
  });

  it("profile update ignores role (and other protected fields)", async () => {
    await registerUser({ email: "editor@example.com", username: "editor" });
    const res = await profilePatch(
      req("/api/profile", {
        method: "PATCH",
        body: { bio: "hi", role: "admin", username: "admin", stat_reaches: 9999 },
      })
    );
    expect(res.status).toBe(200);
    const { profile } = await res.json();
    expect(profile.bio).toBe("hi");
    expect(profile.role).toBe("client");
    expect(profile.username).toBe("editor");
    expect(await roleFor(db, "editor@example.com")).toBe("client");
  });

  it("Better Auth update-user can't set a role", async () => {
    await registerUser({ email: "upd@example.com", username: "upd_user" });
    absorbSetCookies(await authPost(req("/api/auth/update-user", { body: { name: "X", role: "admin" } })));
    expect(await roleFor(db, "upd@example.com")).toBe("client");
  });

  it("a client can't edit another user's profile", async () => {
    await registerUser({ email: "victim@example.com", username: "victim" });
    const { userIdFor } = await import("./helpers/users");
    const victimId = await userIdFor(db, "victim@example.com");
    await registerUser({ email: "attacker@example.com", username: "attacker" });
    const res = await profilePatch(
      req("/api/profile", { method: "PATCH", body: { user_id: victimId, bio: "pwned" } })
    );
    expect(res.status).toBe(403);
  });

  it("only the SUPER_ADMIN_EMAILS address becomes super admin; nobody else gets admin by signing up", async () => {
    await signedInAdmin();
    expect(await roleFor(db, "boss@example.com")).toBe("superadmin");
    expect((await login("boss@example.com")).json.role).toBe("superadmin");
    await registerUser({ email: "wannabe@example.com", username: "wannabe" });
    expect(await roleFor(db, "wannabe@example.com")).toBe("client");
  });
});
