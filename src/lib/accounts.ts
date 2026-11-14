import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getAuth } from "@/lib/auth-server";
import { RESERVED_USERNAMES } from "@/lib/utils";

export class AccountError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export type NewAccount = {
  email: string;
  password: string;
  full_name: string;
  username: string;
  phone?: string;
  designation?: string;
};

async function assertUsernameFree(username: string) {
  if (RESERVED_USERNAMES.has(username)) {
    throw new AccountError(409, "That username is reserved");
  }
  const taken = await getDb()
    .select({ u: schema.profiles.user_id })
    .from(schema.profiles)
    .where(eq(schema.profiles.username, username))
    .get();
  if (taken) throw new AccountError(409, "That username is taken");
}

async function assertEmailFree(email: string) {
  const taken = await getDb()
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.email, email))
    .get();
  if (taken) throw new AccountError(409, "An account with that email already exists");
}

/** Apply the user-chosen public fields. Never touches `role`. */
async function finishProfile(userId: string, a: NewAccount) {
  await getDb()
    .update(schema.profiles)
    .set({
      username: a.username,
      full_name: a.full_name,
      phone: a.phone ?? null,
      designation: a.designation ?? "",
    })
    .where(eq(schema.profiles.user_id, userId));
}

/**
 * Self-registration. Signs the new user in (session cookie is set on the
 * current response by the nextCookies plugin).
 */
export async function registerAndSignIn(a: NewAccount, headers: Headers) {
  await assertUsernameFree(a.username);
  await assertEmailFree(a.email);
  const res = await getAuth().api.signUpEmail({
    body: { email: a.email, password: a.password, name: a.full_name },
    headers,
  });
  await finishProfile(res.user.id, a);
  return res.user.id;
}

/**
 * Admin-created account. Does NOT create a session, so the admin's own
 * cookie is left untouched.
 */
export async function createAccountAsAdmin(a: NewAccount) {
  await assertUsernameFree(a.username);
  await assertEmailFree(a.email);
  const ctx = await getAuth().$context;
  const created = await ctx.internalAdapter.createUser({
    email: a.email,
    name: a.full_name,
    emailVerified: false,
  }, { method: "admin" });
  await ctx.internalAdapter.linkAccount({
    userId: created.id,
    providerId: "credential",
    accountId: created.id,
    password: await ctx.password.hash(a.password),
  });
  await finishProfile(created.id, a);
  return created.id;
}
