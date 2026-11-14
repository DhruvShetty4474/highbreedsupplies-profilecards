import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { setDbForTesting, type DB } from "@/db";
import * as schema from "@/db/schema";

const MIGRATIONS = path.resolve(__dirname, "../../migrations");

/**
 * Fresh in-memory SQLite with the real D1 migrations applied, installed as
 * the app's database. libSQL supports batch() + RETURNING like D1.
 */
export async function freshDb(): Promise<DB> {
  const client = createClient({ url: ":memory:" });
  await client.execute("PRAGMA foreign_keys = ON");
  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    const sql = readFileSync(path.join(MIGRATIONS, f), "utf8");
    for (const stmt of sql.split("--> statement-breakpoint")) {
      const s = stmt.trim();
      if (s) await client.executeMultiple(s);
    }
  }
  const db = drizzle(client, { schema }) as unknown as DB;
  setDbForTesting(db);
  return db;
}

export { schema };
