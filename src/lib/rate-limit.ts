import { sql } from "drizzle-orm";
import type { DB } from "@/db";
import * as schema from "@/db/schema";

/**
 * Fixed-window limiter stored in D1 (Workers share no memory). One atomic
 * upsert per hit. Shares Better Auth's rate_limit table with an `app:` prefix.
 */
export async function hitRateLimit(
  db: DB,
  key: string,
  max: number,
  windowSeconds: number
): Promise<{ ok: boolean; retryAfter: number }> {
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;
  const t = schema.rateLimit;
  const row = await db
    .insert(t)
    .values({ id: crypto.randomUUID(), key: `app:${key}`, count: 1, lastRequest: now })
    .onConflictDoUpdate({
      target: t.key,
      set: {
        count: sql`CASE WHEN ${t.lastRequest} < ${windowStart} THEN 1 ELSE ${t.count} + 1 END`,
        lastRequest: sql`CASE WHEN ${t.lastRequest} < ${windowStart} THEN ${now} ELSE ${t.lastRequest} END`,
      },
    })
    .returning({ count: t.count, lastRequest: t.lastRequest })
    .get();
  const ok = row.count <= max;
  const retryAfter = ok
    ? 0
    : Math.max(1, Math.ceil((row.lastRequest + windowSeconds * 1000 - now) / 1000));
  return { ok, retryAfter };
}

export function clientIp(headers: Headers) {
  return (
    headers.get("cf-connecting-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "unknown"
  );
}

export const LIMITS = {
  loginPerIp: { max: 10, window: 60 },
  loginPerAccount: { max: 5, window: 300 },
  registerPerIp: { max: 5, window: 3600 },
  leadPerIp: { max: 5, window: 3600 },
  statPerVisitor: { max: 3, window: 3600 },
} as const;
