import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { isAdminRole } from "@/lib/roles";
import type { Profile } from "@/lib/types";

/**
 * A signed-in HIGHFIS user opened someone's profile: save their contact to
 * that profile owner's Contacts page automatically (once per pair).
 * Admin/super-admin visits are never recorded. Anonymous visitors can't be
 * identified, so they still use the Exchange Contact form.
 */
export async function recordViewerAsLead(ownerId: string, viewer: Profile | null) {
  if (!viewer || viewer.user_id === ownerId || isAdminRole(viewer.role)) return false;
  const email = viewer.email?.trim().toLowerCase() || null;
  if (!email) return false;
  const db = getDb();
  const existing = await db
    .select({ id: schema.leads.id })
    .from(schema.leads)
    .where(and(eq(schema.leads.cardholder_user_id, ownerId), eq(schema.leads.visitor_email, email)))
    .get();
  if (existing) return false;
  await db.insert(schema.leads).values({
    id: crypto.randomUUID(),
    cardholder_user_id: ownerId,
    visitor_name: viewer.full_name?.trim() || viewer.username,
    visitor_email: email,
    visitor_phone: viewer.phone || null,
    visitor_note: "Viewed your profile (saved automatically)",
  });
  return true;
}
