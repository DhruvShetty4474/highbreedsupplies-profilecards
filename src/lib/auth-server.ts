import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { eq } from "drizzle-orm";
import { getConfig } from "@/config";
import { getDb, schema, type DB } from "@/db";
import { actionEmail, sendEmail } from "@/lib/email";
import { removeMedia } from "@/lib/media";
import { getMediaStore } from "@/lib/r2";
import { RESERVED_USERNAMES } from "@/lib/utils";

/** Emails listed in ADMIN_EMAILS (comma-separated) become admins at signup. */
export function isAdminEmail(email: string) {
  return getConfig().adminEmails.includes(email.trim().toLowerCase());
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
    if (!taken && !RESERVED_USERNAMES.has(candidate)) return candidate;
  }
  return `${base}${crypto.randomUUID().slice(0, 8)}`;
}

export function createAuth(db: DB) {
  const config = getConfig();
  return betterAuth({
    baseURL: config.APP_URL,
    secret: config.BETTER_AUTH_SECRET,
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
      maxPasswordLength: 128,
      requireEmailVerification: config.REQUIRE_EMAIL_VERIFICATION,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 60 * 60,
      sendResetPassword: async ({ user, url }) => {
        await sendEmail(
          actionEmail({
            to: user.email,
            subject: "Reset your HIGHBREED password",
            intro:
              "We received a request to reset your password. The link is valid for 1 hour.",
            cta: "Choose a new password",
            url,
          })
        );
      },
    },
    // Google sign-in when GOOGLE_CLIENT_ID/SECRET are set. Google has
    // already verified the email, and the profile is created by the same
    // user-create hook (role client unless in ADMIN_EMAILS).
    socialProviders: config.features.google
      ? {
          google: {
            clientId: config.GOOGLE_CLIENT_ID!,
            clientSecret: config.GOOGLE_CLIENT_SECRET!,
            prompt: "select_account",
          },
        }
      : undefined,
    account: {
      accountLinking: {
        // Same verified email signing in with Google joins the existing
        // email/password account instead of failing.
        enabled: true,
        trustedProviders: ["google"],
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: config.REQUIRE_EMAIL_VERIFICATION,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        await sendEmail(
          actionEmail({
            to: user.email,
            subject: "Verify your HIGHBREED email",
            intro: "Confirm this email address for your HIGHBREED account.",
            cta: "Verify email",
            url,
          })
        );
      },
    },
    user: {
      deleteUser: {
        enabled: true,
        // Before the user row goes (profile/leads/media rows cascade):
        // delete their R2 objects and park their cards as BLOCKED so an
        // admin decides whether to re-issue them.
        beforeDelete: async (u) => {
          const rows = await db
            .select()
            .from(schema.media)
            .where(eq(schema.media.user_id, u.id));
          const store = getMediaStore();
          if (store && rows.length) await removeMedia(db, store, rows);
          await db
            .update(schema.cards)
            .set({ status: "BLOCKED", blocked_at: new Date().toISOString() })
            .where(eq(schema.cards.user_id, u.id));
        },
      },
    },
    // Applies to requests through /api/auth/* (reset, change password,
    // verification...). Stored in D1 because Workers share no memory.
    // Our own /api/auth/login and /api/auth/signup use lib/rate-limit.ts.
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 60,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 3600, max: 5 },
        "/request-password-reset": { window: 900, max: 3 },
        "/reset-password": { window: 900, max: 5 },
        "/send-verification-email": { window: 900, max: 3 },
        "/change-password": { window: 900, max: 5 },
        "/delete-user": { window: 900, max: 5 },
      },
    },
    advanced: {
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for"] },
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
