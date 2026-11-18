/**
 * Every external setting, read from env and validated with zod.
 *
 * Required settings fail fast with an error that names each missing/invalid
 * variable. Optional services (R2, Resend, Sentry) are switched off cleanly
 * when their keys are absent — see `features`.
 *
 * On Workers, env is per-request (OpenNext fills process.env), so call
 * getConfig() inside handlers, not at module top level.
 */
import { z } from "zod";

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

const positiveNumber = (fallback: number) =>
  z.coerce.number().positive().optional().default(fallback);

const schema = z
  .object({
    // --- Required -----------------------------------------------------------
    APP_URL: z.string().url().default("http://localhost:3000"),
    BETTER_AUTH_SECRET: z
      .string({ error: "is required (generate: openssl rand -base64 32)" })
      .min(32, "must be at least 32 characters (openssl rand -base64 32)"),

    // --- Roles --------------------------------------------------------------
    ADMIN_EMAILS: optionalString,

    // --- R2 media (optional as a group) -------------------------------------
    R2_ACCOUNT_ID: optionalString,
    R2_ACCESS_KEY_ID: optionalString,
    R2_SECRET_ACCESS_KEY: optionalString,
    R2_BUCKET_NAME: optionalString,
    R2_PUBLIC_URL: z.string().url().default("https://media.highfis.com"),
    MEDIA_MAX_IMAGE_MB: positiveNumber(5),
    MEDIA_MAX_VIDEO_MB: positiveNumber(50),
    MEDIA_QUOTA_MB_PER_USER: positiveNumber(100),

    // --- Email (optional; logs to console without a key) --------------------
    RESEND_API_KEY: optionalString,
    EMAIL_FROM: z.string().default("HIGHBREED <no-reply@highfis.com>"),
    REQUIRE_EMAIL_VERIFICATION: z
      .enum(["true", "false"])
      .optional()
      .default("false")
      .transform((v) => v === "true"),

    // --- Google sign-in (optional) ------------------------------------------
    GOOGLE_CLIENT_ID: optionalString,
    GOOGLE_CLIENT_SECRET: optionalString,

    // --- Monitoring (optional) ----------------------------------------------
    SENTRY_DSN: z.string().url().optional().or(z.literal("").transform(() => undefined)),
  });

export type AppConfig = z.output<typeof schema> & {
  features: { media: boolean; email: boolean; sentry: boolean; google: boolean };
  adminEmails: string[];
};

export class ConfigError extends Error {}

const R2_KEYS = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
] as const;

export function parseConfig(env: Record<string, string | undefined>): AppConfig {
  const parsed = schema.safeParse(env);
  const lines = parsed.success
    ? []
    : parsed.error.issues.map((i) => `  • ${String(i.path[0] ?? "env")} ${i.message}`);

  // R2 is all-or-nothing (the bucket name has a default, so check the secrets).
  const r2Set = R2_KEYS.slice(0, 3).filter((k) => env[k]?.trim());
  if (r2Set.length && r2Set.length !== 3) {
    for (const k of R2_KEYS.slice(0, 3)) {
      if (!env[k]?.trim()) lines.push(`  • ${k} is required when any R2_* key is set`);
    }
  }

  if (Boolean(env.GOOGLE_CLIENT_ID?.trim()) !== Boolean(env.GOOGLE_CLIENT_SECRET?.trim())) {
    lines.push("  • GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set together");
  }

  if (!parsed.success || lines.length) {
    throw new ConfigError(
      `Invalid environment configuration:\n${lines.join("\n")}\n` +
        "See .env.example for every variable and what it does."
    );
  }
  const c = parsed.data!;
  return {
    ...c,
    APP_URL: c.APP_URL.replace(/\/$/, ""),
    R2_PUBLIC_URL: c.R2_PUBLIC_URL.replace(/\/$/, ""),
    adminEmails: (c.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
    features: {
      media: Boolean(c.R2_ACCOUNT_ID),
      email: Boolean(c.RESEND_API_KEY),
      sentry: Boolean(c.SENTRY_DSN),
      google: Boolean(c.GOOGLE_CLIENT_ID && c.GOOGLE_CLIENT_SECRET),
    },
  };
}

let cache: { key: string; config: AppConfig } | null = null;

/** Validated config for the current environment (memoized per env snapshot). */
export function getConfig(): AppConfig {
  const env = process.env as Record<string, string | undefined>;
  const key = [
    env.APP_URL,
    env.BETTER_AUTH_SECRET,
    env.ADMIN_EMAILS,
    env.R2_ACCOUNT_ID,
    env.R2_BUCKET_NAME,
    env.R2_PUBLIC_URL,
    env.RESEND_API_KEY,
    env.EMAIL_FROM,
    env.SENTRY_DSN,
    env.MEDIA_QUOTA_MB_PER_USER,
    env.MEDIA_MAX_IMAGE_MB,
    env.MEDIA_MAX_VIDEO_MB,
    env.REQUIRE_EMAIL_VERIFICATION,
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
  ].join("|");
  if (cache?.key !== key) cache = { key, config: parseConfig(env) };
  return cache.config;
}
