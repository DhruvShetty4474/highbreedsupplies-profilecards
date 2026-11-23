import { eq } from "drizzle-orm";
import type { DB } from "@/db";
import * as schema from "@/db/schema";
import { POST as loginRoute } from "@/app/api/auth/login/route";
import { POST as signupRoute } from "@/app/api/auth/signup/route";
import { req, signOutBrowser } from "./next";
import { getDb } from "@/db";
import { createBatch } from "@/lib/cards";

/** Registration needs an unsold HighCard: make one. */
async function freshCardToken() {
  const { cards } = await createBatch(getDb(), { quantity: 1, label: "REG", createdBy: null, baseUrl: "https://highfis.com" });
  return cards[0].public_token;
}

let n = 0;

/** Register through the real signup route; leaves the browser signed in. */
export async function registerUser(
  over: Partial<{ email: string; username: string; password: string; card_token: string }> = {},
  extra: Record<string, unknown> = {}
) {
  n++;
  const body = {
    email: over.email ?? `user${n}@example.com`,
    username: over.username ?? `user_${n}`,
    password: over.password ?? "Password@123",
    full_name: `User ${n}`,
    card_token: over.card_token ?? (await freshCardToken()),
    ...extra,
  };
  signOutBrowser();
  const res = await signupRoute(req("/api/auth/signup", { body }));
  const json = await res.json();
  return { res, json, ...body };
}

export async function login(loginId: string, password = "Password@123") {
  signOutBrowser();
  const res = await loginRoute(req("/api/auth/login", { body: { login_id: loginId, password } }));
  return { res, json: await res.json() };
}

export async function userIdFor(db: DB, email: string) {
  const row = await db.select().from(schema.user).where(eq(schema.user.email, email)).get();
  return row!.id;
}

export async function roleFor(db: DB, email: string) {
  const id = await userIdFor(db, email);
  const p = await db.select().from(schema.profiles).where(eq(schema.profiles.user_id, id)).get();
  return p?.role;
}

/** Registers the super admin (SUPER_ADMIN_EMAILS) and leaves them signed in. */
export async function signedInAdmin() {
  const u = await registerUser({ email: "boss@example.com", username: "the_boss" });
  return u;
}
