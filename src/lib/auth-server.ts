import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { passwordProblem } from "@/lib/password-policy";
import { and, eq, ne } from "drizzle-orm";
import { getConfig } from "@/config";
import { getDb, schema, type DB } from "@/db";
import { actionEmail, otpEmail, sendEmail } from "@/lib/email";
import { prepareUserDeletion } from "@/lib/delete-user";
import { RESERVED_USERNAMES } from "@/lib/utils";

/**
 * Emails in the SUPER_ADMIN_EMAILS secret become the hidden super admin at
 * signup. Everyone else starts as a client; only the super admin can make
 * admins (Admin → Admins).
 */
export function isSuperAdminEmail(email: string) {
  return getConfig().superAdminEmails.includes(email.trim().toLowerCase());
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
    trustedOrigins: config.trustedOrigins,
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
    // user-create hook (role client unless it's the super admin's email).
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
    // Verification is a 6-digit code (emailOTP plugin below replaces the
    // default link email). Signing in while unverified re-sends a code.
    emailVerification: {
      sendOnSignUp: config.REQUIRE_EMAIL_VERIFICATION,
      sendOnSignIn: config.REQUIRE_EMAIL_VERIFICATION,
      autoSignInAfterVerification: true,
    },
    user: {
      deleteUser: {
        enabled: true,
        // Before the user row goes (profile/leads/media rows cascade):
        // delete their R2 objects and park their cards as BLOCKED so an
        // admin decides whether to re-issue them.
        beforeDelete: async (u) => {
          await prepareUserDeletion(db, u.id);
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
        "/email-otp/send-verification-otp": { window: 900, max: 5 },
        "/email-otp/verify-email": { window: 900, max: 10 },
        "/sign-in/email-otp": { window: 900, max: 10 },
        "/delete-user": { window: 900, max: 5 },
      },
    },
    advanced: {
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for"] },
    },
    // Strong-password rule for Better Auth's own endpoints (sign-up, reset, change).
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        const field =
          ctx.path === "/sign-up/email"
            ? "password"
            : ["/reset-password", "/change-password", "/set-password"].includes(ctx.path)
              ? "newPassword"
              : null;
        if (!field) return;
        const problem = passwordProblem((ctx.body as Record<string, string> | undefined)?.[field] ?? "");
        if (problem) throw new APIError("BAD_REQUEST", { message: problem });
      }),
    },
    databaseHooks: {
      // One device at a time: a new sign-in signs out every other session.
      session: {
        create: {
          after: async (s) => {
            await db
              .delete(schema.session)
              .where(and(eq(schema.session.userId, s.userId), ne(schema.session.id, s.id)));
          },
        },
      },
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
                role: isSuperAdminEmail(u.email) ? "superadmin" : "client",
              })
              .onConflictDoNothing();
          },
        },
      },
    },
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 10 * 60,
        allowedAttempts: 5,
        storeOTP: "hashed",
        // OTP sign-in is for existing accounts only; new accounts register
        // through /register (card flow) so they get a username + profile.
        disableSignUp: true,
        overrideDefaultEmailVerification: true,
        sendVerificationOTP: async ({ email, otp, type }) => {
          await sendEmail(otpEmail({ to: email, otp, type }));
        },
      }),
      nextCookies(),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;

/** Better Auth bound to this request's D1 database. */
export function getAuth(): Auth {
  return createAuth(getDb());
}
