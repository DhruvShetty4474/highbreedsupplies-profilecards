import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth-server";
import { fetchProfileById } from "@/lib/data";
import type { Profile } from "@/lib/types";

export class AuthError extends Error {
  constructor(
    public status: 401 | 403,
    message = status === 401 ? "Authentication required" : "Forbidden"
  ) {
    super(message);
  }
}

/** Profile of the signed-in user, or null. Role always comes from the DB. */
export async function getSessionProfile(): Promise<Profile | null> {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return null;
  return fetchProfileById(session.user.id);
}

/** Better Auth user row (sign-in email + verification state). */
export async function getSessionUser() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

export async function requireUser(): Promise<Profile> {
  const profile = await getSessionProfile();
  if (!profile) throw new AuthError(401);
  return profile;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await requireUser();
  if (profile.role !== "admin") throw new AuthError(403, "Admin access required");
  return profile;
}

/**
 * For admin pages. Each page calls this itself: layouts are not re-run on
 * client-side navigation, so a layout-only check is not enough.
 */
export async function requireAdminPage(): Promise<Profile> {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login?next=/admin");
  if (profile.role !== "admin") redirect("/dashboard");
  return profile;
}
