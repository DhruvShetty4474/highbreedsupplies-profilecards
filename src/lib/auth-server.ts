import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { eq } from "drizzle-orm";
import { getDb, schema, type DB } from "@/db";
import { appUrl } from "@/lib/utils";

/** Emails listed in ADMIN_EMAILS (comma-separated) become admins at signup. */
export function isAdminEmail(email: string) {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.trim().toLowerCase());
}

/** Derive a free, valid username from an email local-part. */
export async function uniqueUsername(db: DB, seed: string) {
  let base = seed.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24);
  if (base.length < 3) base = `user${base}`.padEnd(6, "0");
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? base : `${base}${Math.floor(Math.random() * 10_000)}`;
    const taken = await db
      .select({ u: schema.profiles.user_id })
      .from(schema.profiles)
      .where(eq(schema.profiles.username, candidate))
      .get();
    if (!taken) return candidate;
  }
  return `${base}${crypto.randomUUID().slice(0, 8)}`;
}

export function createAuth(db: DB) {
  return betterAuth({
    baseURL: appUrl(),
    secret: process.env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
        rateLimit: schema.rateLimit,
      },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
    },
    databaseHooks: {
      user: {
        create: {
          // Every account gets a profile. Role is decided ONLY here,
          // server-side — never from client input.
          after: async (u) => {
            const username = await uniqueUsername(db, u.email.split("@")[0]);
            await db
              .insert(schema.profiles)
              .values({
                user_id: u.id,
                username,
                full_name: u.name ?? "",
                email: u.email,
                role: isAdminEmail(u.email) ? "admin" : "client",
              })
              .onConflictDoNothing();
          },
        },
      },
    },
    plugins: [nextCookies()],
  });
}

export type Auth = ReturnType<typeof createAuth>;

/** Better Auth bound to this request's D1 database. */
export function getAuth(): Auth {
  return createAuth(getDb());
}
