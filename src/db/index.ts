import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./schema";

export type DB = DrizzleD1Database<typeof schema>;

let override: DB | null = null;

/** Tests inject an alternative Drizzle instance (e.g. in-memory SQLite). */
export function setDbForTesting(db: DB | null) {
  override = db;
}

/**
 * Drizzle client bound to the D1 `DB` binding of the current request.
 * Works in `next dev` via initOpenNextCloudflareForDev (wrangler local D1).
 */
export function getDb(): DB {
  if (override) return override;
  const { env } = getCloudflareContext();
  const binding = env.DB;
  if (!binding) {
    throw new Error(
      "D1 binding `DB` is missing. Check wrangler.jsonc d1_databases."
    );
  }
  return drizzle(binding, { schema });
}

export { schema };
