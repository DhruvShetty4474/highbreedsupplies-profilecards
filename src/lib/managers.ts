import { and, eq } from "drizzle-orm";
import type { DB } from "@/db";
import * as schema from "@/db/schema";

/** True when `userId` currently has the manager role. */
export async function assertManager(db: DB, userId: string) {
  const row = await db
    .select({ id: schema.profiles.user_id })
    .from(schema.profiles)
    .where(and(eq(schema.profiles.user_id, userId), eq(schema.profiles.role, "manager")))
    .get();
  return Boolean(row);
}
